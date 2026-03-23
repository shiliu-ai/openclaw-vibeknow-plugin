export interface FiglensConfig {
  baseUrl: string;
  apiKey: string;
}

export interface GenerateParams {
  knowledge_id: string;
  query: string;
  callback_url: string;
  im_handle: string;
  im_channel: string;
  voice_id?: string;
  bgm_enabled?: boolean;
}

export interface GenerateResult {
  task_id: number;
  session_id: string;
  work_id: number;
  status: string;
}

export interface StatusResult {
  task_id: number;
  status: string;
  stage: string;
  share_url?: string;
  cover_url?: string;
  duration?: number;
  error?: string;
}

export interface UploadResult {
  knowledge_id: string;
}

export interface WorkItem {
  id: number;
  title: string;
  status: number;
  cover_url?: string;
  duration?: number;
  created_at: string;
}

export interface WorkURLResult {
  share_url?: string;
}

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

export class FiglensClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: FiglensConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    return this.post<GenerateResult>("/v1/openclaw/generate", params);
  }

  async getStatus(taskId: number, imHandle: string, imChannel: string): Promise<StatusResult> {
    return this.get<StatusResult>(`/v1/openclaw/status/${taskId}`, {
      "X-IM-Handle": imHandle,
      "X-IM-Channel": imChannel,
    });
  }

  async uploadFile(file: Buffer, filename: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(file)]), filename);

    const resp = await fetch(`${this.baseUrl}/v1/openclaw/upload`, {
      method: "POST",
      headers: { "X-API-Key": this.apiKey },
      body: formData,
    });

    return this.handleResponse<UploadResult>(resp);
  }

  async uploadUrl(url: string): Promise<UploadResult> {
    return this.post<UploadResult>("/v1/openclaw/upload", { url });
  }

  async listWorks(imHandle: string, imChannel: string): Promise<WorkItem[]> {
    return this.get<WorkItem[]>("/v1/openclaw/works", {
      "X-IM-Handle": imHandle,
      "X-IM-Channel": imChannel,
    });
  }

  async getWorkUrl(workId: number): Promise<WorkURLResult> {
    return this.get<WorkURLResult>(`/v1/openclaw/works/${workId}/url`);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(resp);
  }

  private async get<T>(path: string, extraHeaders?: Record<string, string>): Promise<T> {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: {
        "X-API-Key": this.apiKey,
        ...extraHeaders,
      },
    });
    return this.handleResponse<T>(resp);
  }

  private async handleResponse<T>(resp: Response): Promise<T> {
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Figlens API error ${resp.status}: ${text}`);
    }
    const json = (await resp.json()) as ApiResponse<T>;
    if (json.code !== 200) {
      throw new Error(json.msg || `Figlens API returned code ${json.code}`);
    }
    return json.data;
  }
}
