from typing import Optional, Protocol


SERVICE_NAME = "com.jingxu.studio.providers"


class SecretStore(Protocol):
    def get(self, provider_id: str) -> Optional[str]: ...
    def set(self, provider_id: str, value: str) -> None: ...
    def delete(self, provider_id: str) -> None: ...


class KeyringSecretStore:
    def get(self, provider_id: str) -> Optional[str]:
        import keyring
        return keyring.get_password(SERVICE_NAME, provider_id)

    def set(self, provider_id: str, value: str) -> None:
        import keyring
        keyring.set_password(SERVICE_NAME, provider_id, value)

    def delete(self, provider_id: str) -> None:
        import keyring
        try:
            keyring.delete_password(SERVICE_NAME, provider_id)
        except keyring.errors.PasswordDeleteError:
            return
