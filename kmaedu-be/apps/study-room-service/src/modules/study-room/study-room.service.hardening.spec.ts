import { ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { StudyRoomService } from './study-room.service';
import {
    AccessType,
    PlaylistAddPermission,
    StudyRoomRole,
} from './study-room.constants';

const user = { id: 'u1' } as any;

function make() {
    const repo: any = {
        inviteCodeExists: jest.fn().mockResolvedValue(false),
        createWithHost: jest.fn().mockResolvedValue({ id: 'r1' }),
        findByInviteCode: jest.fn(),
        findRoom: jest.fn(),
        findMember: jest.fn().mockResolvedValue(null),
        countMembers: jest.fn().mockResolvedValue(1),
        addMember: jest.fn(),
        findByIdWithMembers: jest.fn().mockResolvedValue({ id: 'r1' }),
    };
    const refund = jest.fn().mockResolvedValue(undefined);
    const codeGuard = { takeGuess: jest.fn().mockResolvedValue(refund) };
    const gen = { generateId: jest.fn().mockReturnValue('gen-id') };
    const service = new StudyRoomService(repo, gen as any, {} as any);
    (service as any).codeGuard = codeGuard;
    return { service, repo, codeGuard, refund };
}

describe('StudyRoomService.createRoom keeps the access settings (S-02)', () => {
    it('stores accessType, whitelist and playlistAddPermission from the DTO', async () => {
        const { service, repo } = make();
        await service.createRoom(user, {
            name: 'Riêng tư',
            accessType: AccessType.WHITELIST,
            whitelist: ['u2', 'u3', 'u2'],
            playlistAddPermission: PlaylistAddPermission.HOST,
        } as any);
        const data = repo.createWithHost.mock.calls[0][0];
        expect(data.accessType).toBe(AccessType.WHITELIST);
        expect(data.whitelist).toEqual(['u2', 'u3']);
        expect(data.playlistAddPermission).toBe(PlaylistAddPermission.HOST);
    });

    it('stores a CODE room as CODE, never as public', async () => {
        const { service, repo } = make();
        await service.createRoom(user, { name: 'Mã', accessType: AccessType.CODE } as any);
        expect(repo.createWithHost.mock.calls[0][0].accessType).toBe(AccessType.CODE);
    });

    it('falls back to the schema defaults when the DTO omits them', async () => {
        const { service, repo } = make();
        await service.createRoom(user, { name: 'Mặc định' } as any);
        const data = repo.createWithHost.mock.calls[0][0];
        expect(data.accessType).toBe(AccessType.PUBLIC);
        expect(data.whitelist).toEqual([]);
        expect(data.playlistAddPermission).toBe(PlaylistAddPermission.COHOST);
    });
});

describe('StudyRoomService join-by-code guessing limit (S-04)', () => {
    it('takes a per-user guess slot before looking the code up', async () => {
        const { service, repo, codeGuard } = make();
        repo.findByInviteCode.mockResolvedValue(null);
        await expect(service.joinByCode(user, '000000')).rejects.toBeInstanceOf(NotFoundException);
        expect(codeGuard.takeGuess).toHaveBeenCalledWith('u1');
    });

    it('does not look the code up at all once the user is locked', async () => {
        const { service, repo, codeGuard } = make();
        codeGuard.takeGuess.mockRejectedValue(new HttpException({ code: 'CODE_LOCKED' }, 429));
        await expect(service.joinByCode(user, '123456')).rejects.toMatchObject({ status: 429 });
        expect(repo.findByInviteCode).not.toHaveBeenCalled();
    });

    it('refunds the slot when the code was right and does not refund a wrong one', async () => {
        const { service, repo, refund } = make();
        repo.findByInviteCode.mockResolvedValueOnce(null);
        await service.joinByCode(user, '000000').catch(() => undefined);
        expect(refund).not.toHaveBeenCalled();
        repo.findByInviteCode.mockResolvedValueOnce({ id: 'r1', isActive: true, accessType: AccessType.CODE, maxParticipants: 5 });
        await service.joinByCode(user, '123456');
        expect(refund).toHaveBeenCalledTimes(1);
    });

    it('joinById on a CODE room takes a per-user and per-room slot; wrong code is Forbidden', async () => {
        const { service, repo, codeGuard, refund } = make();
        repo.findRoom.mockResolvedValue({ id: 'r1', isActive: true, accessType: AccessType.CODE, inviteCode: '123456', maxParticipants: 5 });
        await expect(service.joinById(user, 'r1', '000000')).rejects.toBeInstanceOf(ForbiddenException);
        expect(codeGuard.takeGuess).toHaveBeenCalledWith('u1', 'r1');
        expect(refund).not.toHaveBeenCalled();
        expect(repo.addMember).not.toHaveBeenCalled();
    });

    it('joinById with the right code joins and refunds the slot', async () => {
        const { service, repo, codeGuard, refund } = make();
        repo.findRoom.mockResolvedValue({ id: 'r1', isActive: true, accessType: AccessType.CODE, inviteCode: '123456', maxParticipants: 5 });
        await service.joinById(user, 'r1', '123456');
        expect(codeGuard.takeGuess).toHaveBeenCalledWith('u1', 'r1');
        expect(refund).toHaveBeenCalledTimes(1);
        expect(repo.addMember).toHaveBeenCalledWith('r1', 'u1', StudyRoomRole.MEMBER);
    });

    it('joinById does not spend a guess for rooms that are not CODE, or when no code is sent', async () => {
        const { service, repo, codeGuard } = make();
        repo.findRoom.mockResolvedValue({ id: 'r1', isActive: true, accessType: AccessType.PUBLIC, maxParticipants: 5 });
        await service.joinById(user, 'r1', '000000');
        repo.findRoom.mockResolvedValue({ id: 'r1', isActive: true, accessType: AccessType.CODE, inviteCode: '123456', maxParticipants: 5 });
        await expect(service.joinById(user, 'r1')).rejects.toBeInstanceOf(ForbiddenException);
        expect(codeGuard.takeGuess).not.toHaveBeenCalled();
    });

    it('joinById stops when the guess limit is hit', async () => {
        const { service, repo, codeGuard } = make();
        repo.findRoom.mockResolvedValue({ id: 'r1', isActive: true, accessType: AccessType.CODE, inviteCode: '123456', maxParticipants: 5 });
        codeGuard.takeGuess.mockRejectedValue(new HttpException({ code: 'CODE_LOCKED' }, 429));
        await expect(service.joinById(user, 'r1', '123456')).rejects.toMatchObject({ status: 429 });
        expect(repo.addMember).not.toHaveBeenCalled();
    });
});
