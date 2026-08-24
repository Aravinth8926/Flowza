from fastapi import HTTPException, status

class FlowzaException(HTTPException):
    def __init__(self, status_code: int, detail: str, code: str = "ERROR", details: list = None):
        super().__init__(status_code=status_code, detail=detail)
        self.code = code
        self.details = details or []

class UserAlreadyExistsException(FlowzaException):
    def __init__(self, detail: str = "Email is already registered"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail, code="ALREADY_EXISTS")

class CredentialsException(FlowzaException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, code="UNAUTHORIZED")

class PermissionDeniedException(FlowzaException):
    def __init__(self, detail: str = "Permission denied"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail, code="FORBIDDEN")

class NotFoundException(FlowzaException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail, code="NOT_FOUND")

class ConflictException(FlowzaException):
    def __init__(self, detail: str = "Resource conflict"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail, code="CONFLICT")
