"""Error responses in the contract's format (docs/api-contract.md section 5):

    {"error": {"code": "EMAIL_TAKEN", "message": "..."}}
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class ApiError(Exception):
    """Raise from any route: raise ApiError(409, "EMAIL_TAKEN", "...")."""

    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


async def _api_error(_request: Request, exc: ApiError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message)


async def _validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    # FastAPI's default is 422; the contract uses 400. The submitted values are
    # deliberately not echoed back, so a password never appears in a response.
    first = exc.errors()[0]
    field = ".".join(str(part) for part in first["loc"] if part != "body") or "body"
    return error_response(400, "VALIDATION_ERROR", f"{field}: {first['msg']}")


_HTTP_CODES = {401: "UNAUTHORIZED", 404: "NOT_FOUND"}


async def _http_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    # Framework errors such as an unknown URL (404) or wrong method (405).
    return error_response(exc.status_code, _HTTP_CODES.get(exc.status_code, "HTTP_ERROR"), str(exc.detail))


async def _unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
    # Details go to the server log only, never to the client.
    logger.exception("Unhandled error", exc_info=exc)
    return error_response(500, "INTERNAL_ERROR", "Something went wrong on the server.")


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, _api_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(Exception, _unexpected_error)
