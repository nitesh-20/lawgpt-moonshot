import re


class ChunkingService:
    """
    Implements intelligent semantic chunking for legal documents.
    Target chunk size: 800–1200 tokens (estimated as words).
    Overlap: 150–200 tokens.
    Preserves legal provisions, sections, and paragraphs without mid-sentence splits.
    """

    def __init__(self, target_size: int = 1000, overlap: int = 175) -> None:
        self.target_size = target_size
        self.overlap = overlap

    def estimate_tokens(self, text: str) -> int:
        """
        Estimate token count using word splits.
        """
        return len(text.split())

    async def chunk_document(self, text: str) -> list[str]:
        if not text:
            return []

        # Split text into structural paragraphs first (keeping provisions intact)
        paragraphs = re.split(r'\n\n+', text)
        chunks = []
        current_chunk = []
        current_size = 0

        for para in paragraphs:
            para_size = self.estimate_tokens(para)

            # If a single paragraph exceeds the target size, split it by sentence structures
            if para_size > self.target_size:
                sentences = re.split(r'(?<=[.!?])\s+', para)
                for sentence in sentences:
                    sent_size = self.estimate_tokens(sentence)
                    if current_size + sent_size > self.target_size:
                        if current_chunk:
                            chunks.append(" ".join(current_chunk))

                        # Build overlap context from trailing sentences
                        overlap_chunk = []
                        overlap_size = 0
                        for old_sent in reversed(current_chunk):
                            old_size = self.estimate_tokens(old_sent)
                            if overlap_size + old_size > self.overlap:
                                break
                            overlap_chunk.insert(0, old_sent)
                            overlap_size += old_size

                        current_chunk = overlap_chunk + [sentence]
                        current_size = overlap_size + sent_size
                    else:
                        current_chunk.append(sentence)
                        current_size += sent_size
            else:
                if current_size + para_size > self.target_size:
                    if current_chunk:
                        chunks.append("\n\n".join(current_chunk))

                    # Build overlap context from trailing paragraphs
                    overlap_chunk = []
                    overlap_size = 0
                    for old_para in reversed(current_chunk):
                        old_size = self.estimate_tokens(old_para)
                        if overlap_size + old_size > self.overlap:
                            break
                        overlap_chunk.insert(0, old_para)
                        overlap_size += old_size

                    current_chunk = overlap_chunk + [para]
                    current_size = overlap_size + para_size
                else:
                    current_chunk.append(para)
                    current_size += para_size

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return [c.strip() for c in chunks if c.strip()]
