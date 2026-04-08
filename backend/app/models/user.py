from pydantic import BaseModel


class UserInfo(BaseModel):
    oid: str
    name: str = ""
    email: str = ""
    roles: list[str] = ["Viewer"]
