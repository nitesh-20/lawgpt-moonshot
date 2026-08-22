from loguru import logger


class StorageService:
    """
    Wraps Google Cloud Storage operations for document assets.
    """

    def __init__(self) -> None:
        pass

    async def upload_file(self, file_bytes: bytes, destination_blob_name: str) -> str:
        logger.info(f"Uploading asset to bucket: {destination_blob_name}")
        return f"gs://mock-bucket/{destination_blob_name}"

    async def download_file(self, blob_name: str) -> bytes:
        logger.info(f"Downloading asset from bucket: {blob_name}")
        return b""
