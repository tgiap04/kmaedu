"""Errors that steer the consumer's retry / dead-letter decision."""


class PermanentEventError(Exception):
    """Retrying can never succeed: the message goes straight to ``<svc>.dlq``."""

    def __init__(self, code: str, message: str | None = None) -> None:
        """Create the error with a stable ``code`` used in logs."""
        super().__init__(message or code)
        self.code = code


class DeferEventError(Exception):
    """Not yet, but not a failure: the message goes back through the retry tier.

    The retry count is kept and ``x-defer-count`` goes up instead, so a handler that
    waits for something (a GraphRAG index being built) does not spend its retry budget.
    The handler caps the wait itself by reading ``HandlerContext.defer_count``.
    """

    def __init__(self, code: str) -> None:
        """Create the deferral with a stable ``code`` used in logs."""
        super().__init__(code)
        self.code = code
