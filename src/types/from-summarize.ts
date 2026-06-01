export interface IndexedChunk {
  index: number;
  title: string;
  text: string;
}

export interface OutputFile {
  id: string;
  jobId: string;
  fileName: string;
  chunks: IndexedChunk[];
}
