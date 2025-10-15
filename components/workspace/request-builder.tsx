"use client";

import Image from "next/image";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/ui/code-editor";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TAB_VALUES = [
  "params",
  "auth",
  "headers",
  "body",
  "pre-request",
  "tests",
] as const;
const TAB_SET = new Set<string>(TAB_VALUES);
const DEFAULT_TAB = TAB_VALUES[0];

interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

type AuthType = "none" | "bearer" | "basic" | "api-key" | "oauth2";

interface Auth {
  type: AuthType;
  bearer?: {
    token: string;
  };
  basic?: {
    username: string;
    password: string;
  };
  apiKey?: {
    key: string;
    value: string;
    addTo: "header" | "query";
  };
  oauth2?: {
    accessToken: string;
  };
}

interface Request {
  _id: string;
  name: string;
  method: string;
  url: string;
  headers: Header[];
  queryParams: QueryParam[];
  workspaceId: string;
  folderId?: string;
  auth?: Auth;
  body?: string;
  bodyType?: string;
}

type ResponseBodyType = "json" | "text" | "html" | "image" | "binary";
type ResponseEncoding = "utf8" | "base64";

type BodyViewMode = "pretty" | "raw" | "preview";

interface Response {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  bodyType: ResponseBodyType;
  bodyText?: string;
  encoding?: ResponseEncoding;
  contentType?: string;
  time: number;
  size: number;
}

const RESPONSE_VIEW_LABELS: Record<BodyViewMode, string> = {
  pretty: "Pretty",
  raw: "Raw",
  preview: "Preview",
};

const formatBytes = (bytes: number) => {
  if (Number.isNaN(bytes) || bytes === Infinity) {
    return "—";
  }
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, idx);
  return `${value.toFixed(2)} ${units[idx]}`;
};

const VOID_HTML_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const formatHtml = (html: string) => {
  const normalized = html
    .replace(/>\s+</g, "><")
    .replace(/></g, ">\n<")
    .replace(/\r\n/g, "\n");

  const lines = normalized.split("\n");
  let indentLevel = 0;

  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const isClosingTag = /^<\/[^>]+>/.test(line);
      const isSelfClosing = /\/>$/.test(line);
      const tagMatch = line.match(/^<([a-zA-Z0-9-]+)/);
      const tagName = tagMatch?.[1]?.toLowerCase();

      if (isClosingTag) {
        indentLevel = Math.max(indentLevel - 1, 0);
      }

      const indentation = "  ".repeat(indentLevel);

      if (
        !isClosingTag &&
        !isSelfClosing &&
        tagName &&
        !VOID_HTML_TAGS.has(tagName)
      ) {
        indentLevel += 1;
      }

      return `${indentation}${line}`;
    })
    .join("\n");
};

const determineAvailableViews = (resp: Response): BodyViewMode[] => {
  switch (resp.bodyType) {
    case "json":
      return ["pretty", "raw"];
    case "html":
      return ["preview", "raw"];
    case "image":
      return ["preview", "raw"];
    case "text":
    case "binary":
    default:
      return ["raw"];
  }
};

const determineDefaultView = (resp: Response): BodyViewMode => {
  const available = determineAvailableViews(resp);
  if (available.includes("pretty")) return "pretty";
  if (available.includes("preview")) return "preview";
  return available[0] ?? "raw";
};

interface RequestBuilderProps {
  requestId: string;
}

export function RequestBuilder({ requestId }: RequestBuilderProps) {
  const queryClient = useQueryClient();
  const [localRequest, setLocalRequest] = useState<Request | null>(null);
  const [response, setResponse] = useState<Response | null>(null);
  const [responseView, setResponseView] = useState<BodyViewMode>("raw");
  const [activeResponseTab, setActiveResponseTab] = useState<"body" | "headers">("body");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>(() => {
    const initial = searchParams.get("tab");
    return initial && TAB_SET.has(initial) ? initial : DEFAULT_TAB;
  });

  const persistTabInUrl = useCallback(
    (value: string) => {
      if (searchParams.get("tab") === value) return;
      const nextSearch = new URLSearchParams(searchParams);
      nextSearch.set("tab", value);
      const query = nextSearch.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const fromQuery = searchParams.get("tab");
    if (fromQuery && TAB_SET.has(fromQuery)) {
      if (fromQuery !== activeTab) {
        setActiveTab(fromQuery);
      }
      return;
    }

    if (!fromQuery && activeTab !== DEFAULT_TAB) {
      setActiveTab(DEFAULT_TAB);
      return;
    }

    if (fromQuery && !TAB_SET.has(fromQuery)) {
      setActiveTab(DEFAULT_TAB);
      persistTabInUrl(DEFAULT_TAB);
    }
  }, [activeTab, persistTabInUrl, searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      if (!TAB_SET.has(value)) return;
      setActiveTab(value);
      persistTabInUrl(value);
    },
    [persistTabInUrl],
  );

  useEffect(() => {
    if (!response) {
      setResponseView("raw");
      setActiveResponseTab("body");
      return;
    }
    setResponseView(determineDefaultView(response));
    setActiveResponseTab("body");
  }, [response]);

  const availableViews = useMemo(
    () => (response ? determineAvailableViews(response) : []),
    [response],
  );

  const contentTypeLabel = useMemo(() => {
    if (!response) return "";
    if (response.contentType) {
      return response.contentType.split(";")[0];
    }
    return response.bodyType.toUpperCase();
  }, [response]);

  const bodyContent = useMemo(() => {
    if (!response) return null;

    if (responseView === "preview") {
      if (response.bodyType === "image" && typeof response.body === "string") {
        const dataUrl = `data:${response.contentType || "image/*"};base64,${response.body}`;
        return (
          <div className="flex h-full w-full items-center justify-center bg-muted/10">
            <Image
              src={dataUrl}
              alt="Response preview"
              className="max-h-full max-w-full rounded border border-border/60 bg-white"
              width={400}
              height={400}
            />
          </div>
        );
      }

      if (response.bodyType === "html" && typeof response.body === "string") {
        return (
          <iframe
            title="Response HTML Preview"
            className="h-full w-full rounded border border-border/60 bg-white"
            sandbox=""
            srcDoc={response.body}
          />
        );
      }

      return (
        <div className="text-xs text-muted-foreground">
          Keine Vorschau für diesen Inhaltstyp verfügbar.
        </div>
      );
    }

    if (responseView === "pretty" && response.bodyType === "json") {
      return (
        <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
          {JSON.stringify(response.body, null, 2)}
        </pre>
      );
    }

    let rawContent: string;
    if (response.bodyType === "json") {
      rawContent = response.bodyText ?? JSON.stringify(response.body, null, 2);
    } else if (
      response.bodyType === "html" &&
      typeof response.body === "string"
    ) {
      rawContent = formatHtml(response.body);
    } else if (typeof response.body === "string") {
      rawContent = response.body;
    } else {
      rawContent = JSON.stringify(response.body, null, 2);
    }

    return (
      <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
        {rawContent}
      </pre>
    );
  }, [response, responseView]);

  // Fetch request data with useQuery
  const { data: request, isLoading: isFetchingRequest } = useQuery({
    queryKey: ["request", requestId],
    queryFn: async () => {
      const res = await fetch(`/api/requests/${requestId}`);
      if (!res.ok) throw new Error("Failed to fetch request");
      const data = await res.json();

      // Parse URL and sync query params
      const parsedParams = parseUrlParams(data.url);
      if (parsedParams.length > 0) {
        data.queryParams = parsedParams;
        data.url = data.url.split("?")[0]; // Store base URL
      }

      return data as Request;
    },
    enabled: !!requestId,
  });

  // Update local state when request data changes
  useEffect(() => {
    if (request) {
      // Ensure auth object exists with default type
      if (!request.auth) {
        request.auth = { type: "none" };
      }
      setLocalRequest(request);
      setResponse(null);
    }
  }, [request]);

  // Save mutation
  const saveMutation = useMutation<Request, Error, Request>({
    mutationFn: async (updatedRequest: Request) => {
      const res = await fetch(`/api/requests/${updatedRequest._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRequest),
      });
      if (!res.ok) throw new Error("Failed to save request");
      const data = await res.json();
      return data as Request;
    },
    onSuccess: (updated) => {
      const normalized = {
        ...updated,
        auth: updated.auth ?? { type: "none" },
      };
      setLocalRequest(normalized);
      queryClient.setQueryData(["request", requestId], normalized);
      queryClient.invalidateQueries({ queryKey: ["request", requestId] });
      if (normalized.workspaceId) {
        queryClient.invalidateQueries({
          queryKey: ["requests", normalized.workspaceId],
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ["requests"] });
      }
    },
  });

  // Execute request mutation
  const executeMutation = useMutation<Response, Error, Request>({
    mutationFn: async (requestData: Request) => {
      // Build URL with query params
      let url = requestData.url;
      const enabledParams = requestData.queryParams.filter(
        (p) => p.enabled && p.key,
      );

      // Build headers
      const headers: Record<string, string> = {};
      requestData.headers
        .filter((h) => h.enabled && h.key)
        .forEach((h) => {
          headers[h.key] = h.value;
        });

      // Add auth headers/params
      if (requestData.auth) {
        if (
          requestData.auth.type === "bearer" &&
          requestData.auth.bearer?.token
        ) {
          headers["Authorization"] = `Bearer ${requestData.auth.bearer.token}`;
        } else if (
          requestData.auth.type === "basic" &&
          requestData.auth.basic
        ) {
          const credentials = btoa(
            `${requestData.auth.basic.username}:${requestData.auth.basic.password}`,
          );
          headers["Authorization"] = `Basic ${credentials}`;
        } else if (
          requestData.auth.type === "api-key" &&
          requestData.auth.apiKey
        ) {
          if (requestData.auth.apiKey.addTo === "header") {
            headers[requestData.auth.apiKey.key] =
              requestData.auth.apiKey.value;
          } else {
            enabledParams.push({
              key: requestData.auth.apiKey.key,
              value: requestData.auth.apiKey.value,
              enabled: true,
            });
          }
        } else if (
          requestData.auth.type === "oauth2" &&
          requestData.auth.oauth2?.accessToken
        ) {
          headers["Authorization"] =
            `Bearer ${requestData.auth.oauth2.accessToken}`;
        }
      }

      // Apply query params to URL
      if (enabledParams.length > 0) {
        const params = new URLSearchParams();
        enabledParams.forEach((p) => params.append(p.key, p.value));
        url = `${url}?${params.toString()}`;
      }

      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: requestData.method,
          url,
          headers,
          body: requestData.body,
        }),
      });

      if (!res.ok) throw new Error("Failed to execute request");
      const data = await res.json();
      return data as Response;
    },
    onSuccess: (data) => {
      setResponse(data);
    },
  });

  const isExecuting = executeMutation.isPending;

  const parseUrlParams = (url: string): QueryParam[] => {
    try {
      const urlObj = new URL(url);
      const params: QueryParam[] = [];
      urlObj.searchParams.forEach((value, key) => {
        params.push({ key, value, enabled: true });
      });
      return params;
    } catch {
      // If URL is invalid, return empty array
      return [];
    }
  };

  const updateAuth = (type: AuthType) => {
    if (!localRequest) return;
    setLocalRequest({
      ...localRequest,
      auth: {
        type,
        ...(type === "bearer" && { bearer: { token: "" } }),
        ...(type === "basic" && { basic: { username: "", password: "" } }),
        ...(type === "api-key" && {
          apiKey: { key: "", value: "", addTo: "header" as const },
        }),
        ...(type === "oauth2" && { oauth2: { accessToken: "" } }),
      },
    });
  };

  const updateAuthField = (field: string, value: string) => {
    if (!localRequest?.auth) return;

    const authType = localRequest.auth.type;
    const updatedAuth = { ...localRequest.auth };

    if (authType === "bearer") {
      updatedAuth.bearer = { ...updatedAuth.bearer, [field]: value } as {
        token: string;
      };
    } else if (authType === "basic") {
      updatedAuth.basic = { ...updatedAuth.basic, [field]: value } as {
        username: string;
        password: string;
      };
    } else if (authType === "api-key") {
      updatedAuth.apiKey = { ...updatedAuth.apiKey, [field]: value } as {
        key: string;
        value: string;
        addTo: "header" | "query";
      };
    } else if (authType === "oauth2") {
      updatedAuth.oauth2 = { ...updatedAuth.oauth2, [field]: value } as {
        accessToken: string;
      };
    }

    setLocalRequest({
      ...localRequest,
      auth: updatedAuth,
    });
  };

  const updateBodyType = (newBodyType: string) => {
    if (!localRequest) return;

    // Update headers to match content type
    const contentTypeMap: Record<string, string> = {
      json: "application/json",
      xml: "application/xml",
      text: "text/plain",
      "form-data": "multipart/form-data",
      urlencoded: "application/x-www-form-urlencoded",
    };

    const newContentType = contentTypeMap[newBodyType];
    let updatedHeaders = [...localRequest.headers];

    if (newBodyType === "none") {
      // Remove Content-Type header
      updatedHeaders = updatedHeaders.filter(
        (h) => h.key.toLowerCase() !== "content-type",
      );
    } else if (newContentType) {
      // Update or add Content-Type header
      const contentTypeIndex = updatedHeaders.findIndex(
        (h) => h.key.toLowerCase() === "content-type",
      );
      if (contentTypeIndex >= 0) {
        updatedHeaders[contentTypeIndex] = {
          ...updatedHeaders[contentTypeIndex],
          value: newContentType,
        };
      } else {
        updatedHeaders.push({
          key: "Content-Type",
          value: newContentType,
          enabled: true,
        });
      }
    }

    setLocalRequest({
      ...localRequest,
      bodyType: newBodyType,
      headers: updatedHeaders,
    });
  };

  const handleSave = () => {
    if (!localRequest) return;
    saveMutation.mutate(localRequest);
  };

  const handleSend = () => {
    if (!localRequest) return;
    setResponse(null);
    setResponseView("raw");
    executeMutation.mutate(localRequest);
  };

  const addHeader = () => {
    if (!localRequest) return;
    setLocalRequest({
      ...localRequest,
      headers: [...localRequest.headers, { key: "", value: "", enabled: true }],
    });
  };

  const updateHeader = (
    index: number,
    field: keyof Header,
    value: string | boolean,
  ) => {
    if (!localRequest) return;
    const newHeaders = [...localRequest.headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setLocalRequest({ ...localRequest, headers: newHeaders });
  };

  const removeHeader = (index: number) => {
    if (!localRequest) return;
    setLocalRequest({
      ...localRequest,
      headers: localRequest.headers.filter((_, i) => i !== index),
    });
  };

  const addQueryParam = () => {
    if (!localRequest) return;
    const newParams = [
      ...localRequest.queryParams,
      { key: "", value: "", enabled: true },
    ];
    setLocalRequest({
      ...localRequest,
      queryParams: newParams,
    });
  };

  const updateQueryParam = (
    index: number,
    field: keyof QueryParam,
    value: string | boolean,
  ) => {
    if (!localRequest) return;
    const newParams = [...localRequest.queryParams];
    newParams[index] = { ...newParams[index], [field]: value };

    // Extract base URL without query params
    const urlWithoutParams = localRequest.url.split("?")[0];

    // Build query string from enabled params with keys
    const enabledParams = newParams.filter((p) => p.enabled && p.key);

    let newUrl = urlWithoutParams;
    if (enabledParams.length > 0) {
      const queryString = enabledParams
        .map(
          (p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
        )
        .join("&");
      newUrl = `${urlWithoutParams}?${queryString}`;
    }

    setLocalRequest({
      ...localRequest,
      queryParams: newParams,
      url: newUrl,
    });
  };

  const removeQueryParam = (index: number) => {
    if (!localRequest) return;
    const newParams = localRequest.queryParams.filter((_, i) => i !== index);

    // Extract base URL without query params
    const urlWithoutParams = localRequest.url.split("?")[0];

    // Build query string from enabled params with keys
    const enabledParams = newParams.filter((p) => p.enabled && p.key);

    let newUrl = urlWithoutParams;
    if (enabledParams.length > 0) {
      const queryString = enabledParams
        .map(
          (p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
        )
        .join("&");
      newUrl = `${urlWithoutParams}?${queryString}`;
    }

    setLocalRequest({
      ...localRequest,
      queryParams: newParams,
      url: newUrl,
    });
  };

  if (isFetchingRequest) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Lade Request...
      </div>
    );
  }

  if (!localRequest) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Wähle einen Request aus oder erstelle einen neuen
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Request Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 space-y-4 border-b">
          {/* Name */}
          <div className="flex items-center gap-2">
            <Input
              value={localRequest.name}
              onChange={(e) =>
                setLocalRequest({ ...localRequest, name: e.target.value })
              }
              className="font-semibold"
              placeholder="Request Name"
            />
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              variant="outline"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Speichere..." : "Speichern"}
            </Button>
          </div>

          {/* URL Bar */}
          <div className="flex gap-2">
            <Select
              value={localRequest.method}
              onValueChange={(value) =>
                setLocalRequest({ ...localRequest, method: value })
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="HEAD">HEAD</SelectItem>
                <SelectItem value="OPTIONS">OPTIONS</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={localRequest.url}
              onChange={(e) =>
                setLocalRequest({ ...localRequest, url: e.target.value })
              }
              placeholder="https://api.example.com/endpoint"
              className="flex-1"
            />

            <Button onClick={handleSend} disabled={executeMutation.isPending}>
              <Send className="h-4 w-4 mr-2" />
              {executeMutation.isPending ? "Sende..." : "Send"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="px-4 bg-muted/30">
            <TabsTrigger value="params">Params</TabsTrigger>
            <TabsTrigger value="auth">Authorization</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
            <TabsTrigger value="pre-request">Pre-request Script</TabsTrigger>
            <TabsTrigger value="tests">Tests</TabsTrigger>
          </TabsList>

          {/* Query Params */}
          <TabsContent
            value="params"
            className="flex-1 flex flex-col overflow-hidden m-0"
          >
            <div className="border-b bg-muted/20">
              <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-0 text-xs font-medium text-muted-foreground">
                <div className="px-3 py-2"></div>
                <div className="px-3 py-2 border-l">KEY</div>
                <div className="px-3 py-2 border-l">VALUE</div>
                <div className="px-3 py-2 border-l"></div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="divide-y border-b">
                {localRequest.queryParams.map((param, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[40px_1fr_1fr_40px] gap-0 items-center group hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-center px-3 py-2 h-full border-r">
                      <input
                        type="checkbox"
                        checked={param.enabled}
                        onChange={(e) =>
                          updateQueryParam(index, "enabled", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-input"
                      />
                    </div>
                    <div className="px-3 py-0 border-r">
                      <Input
                        value={param.key}
                        onChange={(e) =>
                          updateQueryParam(index, "key", e.target.value)
                        }
                        placeholder="key"
                        className="h-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                      />
                    </div>
                    <div className="px-3 py-0 border-r">
                      <Input
                        value={param.value}
                        onChange={(e) =>
                          updateQueryParam(index, "value", e.target.value)
                        }
                        placeholder="value"
                        className="h-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                      />
                    </div>
                    <div className="flex items-center justify-center px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeQueryParam(index);
                        }}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addQueryParam}
                  className="h-8 text-xs"
                >
                  Add Parameter
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Authorization */}
          <TabsContent
            value="auth"
            className="flex-1 flex flex-col overflow-hidden m-0"
          >
            <div className="border-b bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <Label className="text-xs font-medium text-muted-foreground">
                  TYPE
                </Label>
                <Select
                  value={localRequest.auth?.type || "none"}
                  onValueChange={(value: AuthType) => updateAuth(value)}
                >
                  <SelectTrigger className="w-[200px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Auth</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="api-key">API Key</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {localRequest.auth?.type === "none" && (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Dieser Request benötigt keine Authentifizierung.
                  </p>
                </div>
              )}

              {localRequest.auth?.type === "bearer" && (
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bearer-token" className="text-sm">
                      Token
                    </Label>
                    <Input
                      id="bearer-token"
                      type="password"
                      value={localRequest.auth.bearer?.token || ""}
                      onChange={(e) => updateAuthField("token", e.target.value)}
                      placeholder="Enter bearer token"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Der Token wird als &quot;Authorization: Bearer {"<token>"}
                      &quot; Header gesendet.
                    </p>
                  </div>
                </div>
              )}

              {localRequest.auth?.type === "basic" && (
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="basic-username" className="text-sm">
                      Username
                    </Label>
                    <Input
                      id="basic-username"
                      value={localRequest.auth.basic?.username || ""}
                      onChange={(e) =>
                        updateAuthField("username", e.target.value)
                      }
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basic-password" className="text-sm">
                      Password
                    </Label>
                    <Input
                      id="basic-password"
                      type="password"
                      value={localRequest.auth.basic?.password || ""}
                      onChange={(e) =>
                        updateAuthField("password", e.target.value)
                      }
                      placeholder="Enter password"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Credentials werden als Base64-encodierter
                    &quot;Authorization: Basic&quot; Header gesendet.
                  </p>
                </div>
              )}

              {localRequest.auth?.type === "api-key" && (
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apikey-key" className="text-sm">
                      Key
                    </Label>
                    <Input
                      id="apikey-key"
                      value={localRequest.auth.apiKey?.key || ""}
                      onChange={(e) => updateAuthField("key", e.target.value)}
                      placeholder="X-API-Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apikey-value" className="text-sm">
                      Value
                    </Label>
                    <Input
                      id="apikey-value"
                      type="password"
                      value={localRequest.auth.apiKey?.value || ""}
                      onChange={(e) => updateAuthField("value", e.target.value)}
                      placeholder="Enter API key"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apikey-addto" className="text-sm">
                      Add to
                    </Label>
                    <Select
                      value={localRequest.auth.apiKey?.addTo || "header"}
                      onValueChange={(value) => updateAuthField("addTo", value)}
                    >
                      <SelectTrigger id="apikey-addto" className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="header">Header</SelectItem>
                        <SelectItem value="query">Query Params</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Der API Key wird entweder als Header oder Query Parameter
                    hinzugefügt.
                  </p>
                </div>
              )}

              {localRequest.auth?.type === "oauth2" && (
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="oauth2-token" className="text-sm">
                      Access Token
                    </Label>
                    <Input
                      id="oauth2-token"
                      type="password"
                      value={localRequest.auth.oauth2?.accessToken || ""}
                      onChange={(e) =>
                        updateAuthField("accessToken", e.target.value)
                      }
                      placeholder="Enter access token"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Der Access Token wird als &quot;Authorization: Bearer{" "}
                      {"<token>"}&quot; Header gesendet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Headers */}
          <TabsContent
            value="headers"
            className="flex-1 flex flex-col overflow-hidden m-0"
          >
            <div className="border-b bg-muted/20">
              <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-0 text-xs font-medium text-muted-foreground">
                <div className="px-3 py-2"></div>
                <div className="px-3 py-2 border-l">KEY</div>
                <div className="px-3 py-2 border-l">VALUE</div>
                <div className="px-3 py-2 border-l"></div>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="divide-y border-b">
                {localRequest.headers.map((header, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[40px_1fr_1fr_40px] gap-0 items-center group hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-center px-3 py-2 h-full border-r">
                      <input
                        type="checkbox"
                        checked={header.enabled}
                        onChange={(e) =>
                          updateHeader(index, "enabled", e.target.checked)
                        }
                        className="h-4 w-4 rounded border-input"
                      />
                    </div>
                    <div className="px-3 py-0 border-r">
                      <Input
                        value={header.key}
                        onChange={(e) =>
                          updateHeader(index, "key", e.target.value)
                        }
                        placeholder="key"
                        className="h-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                      />
                    </div>
                    <div className="px-3 py-0 border-r">
                      <Input
                        value={header.value}
                        onChange={(e) =>
                          updateHeader(index, "value", e.target.value)
                        }
                        placeholder="value"
                        className="h-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                      />
                    </div>
                    <div className="flex items-center justify-center px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHeader(index)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addHeader}
                  className="h-8 text-xs"
                >
                  Add Header
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Body */}
          <TabsContent
            value="body"
            className="flex-1 flex flex-col overflow-hidden m-0"
          >
            <div className="border-b px-4 py-3 bg-muted/20">
              <div className="flex items-center gap-3">
                <Label className="text-xs font-medium text-muted-foreground">
                  TYPE
                </Label>
                <Select
                  value={localRequest.bodyType || "none"}
                  onValueChange={updateBodyType}
                >
                  <SelectTrigger className="w-[200px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">none</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="xml">XML</SelectItem>
                    <SelectItem value="form-data">form-data</SelectItem>
                    <SelectItem value="urlencoded">
                      x-www-form-urlencoded
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {localRequest.bodyType === "none" && (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Dieser Request hat keinen Body.
                  </p>
                </div>
              )}
              {localRequest.bodyType && localRequest.bodyType !== "none" && (
                <div className="h-full">
                  <CodeEditor
                    value={localRequest.body || ""}
                    onChange={(value) =>
                      setLocalRequest((prev) =>
                        prev ? { ...prev, body: value } : prev,
                      )
                    }
                    language={
                      localRequest.bodyType === "json"
                        ? "json"
                        : localRequest.bodyType === "xml"
                          ? "xml"
                          : localRequest.bodyType === "text"
                            ? "plaintext"
                            : "plaintext"
                    }
                    placeholder={
                      localRequest.bodyType === "json"
                        ? '{\n  "key": "value"\n}'
                        : localRequest.bodyType === "xml"
                          ? '<?xml version="1.0"?>\n<root>\n  <item>value</item>\n</root>'
                          : localRequest.bodyType === "urlencoded"
                            ? "key1=value1&key2=value2"
                            : localRequest.bodyType === "form-data"
                              ? "key1=value1\nkey2=value2"
                              : "Enter body content..."
                    }
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Pre-request Script */}
          <TabsContent value="pre-request" className="flex-1 overflow-auto p-4">
            <Textarea
              placeholder="// Write pre-request script here&#10;// This will execute before the request is sent"
              className="min-h-[300px] font-mono text-sm"
              disabled
            />
            <p className="text-xs text-muted-foreground mt-2">Coming soon...</p>
          </TabsContent>

          {/* Tests */}
          <TabsContent value="tests" className="flex-1 overflow-auto p-4">
            <Textarea
              placeholder="// Write test scripts here&#10;// Example:&#10;// pm.test('Status code is 200', function() {&#10;//   pm.response.to.have.status(200);&#10;// });"
              className="min-h-[300px] font-mono text-sm"
              disabled
            />
            <p className="text-xs text-muted-foreground mt-2">Coming soon...</p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Response Section */}
      {(response || isExecuting) && (
        <div className="flex-1 border-t flex flex-col overflow-hidden bg-muted/10">
          <div className="px-4 py-2 border-b flex flex-wrap items-center gap-3 bg-background text-xs">
            <span className="font-medium text-muted-foreground uppercase tracking-wide">
              Response
            </span>
            {response ? (
              <>
                <Badge
                  variant={
                    response.status >= 200 && response.status < 300
                      ? "default"
                      : "destructive"
                  }
                  className="font-mono text-xs"
                >
                  {response.status} {response.statusText}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
                  {formatBytes(response.size)}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5">
                  {response.time} ms
                </Badge>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground" />
                Request wird ausgeführt...
              </div>
            )}
            {response && (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant={activeResponseTab === "body" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setActiveResponseTab("body")}
                >
                  Body
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-3 text-xs" disabled>
                  Cookies
                </Button>
                <Button
                  variant={activeResponseTab === "headers" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setActiveResponseTab("headers")}
                >
                  Headers ({Object.keys(response.headers).length})
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-3 text-xs" disabled>
                  Tests
                </Button>
              </div>
            )}
          </div>

          {response ? (
            activeResponseTab === "headers" ? (
              <div className="flex-1 overflow-auto">
                <div className="border-b bg-muted/20">
                  <div className="grid grid-cols-2 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
                    <div>KEY</div>
                    <div>VALUE</div>
                  </div>
                </div>
                <div className="divide-y">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div
                      key={key}
                      className="grid grid-cols-2 gap-2 px-4 py-2 text-xs hover:bg-muted/50"
                    >
                      <span className="font-medium font-mono">{key}</span>
                      <span className="text-muted-foreground break-all">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b p-2 bg-muted/20 flex items-center gap-2">
                  {availableViews.length > 1 ? (
                    <Select
                      value={responseView}
                      onValueChange={(value) =>
                        setResponseView(value as BodyViewMode)
                      }
                    >
                      <SelectTrigger className="w-[140px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableViews.map((view) => (
                          <SelectItem key={view} value={view}>
                            {RESPONSE_VIEW_LABELS[view]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="rounded border border-border/40 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                      {RESPONSE_VIEW_LABELS[availableViews[0] ?? "raw"]}
                    </div>
                  )}
                  {contentTypeLabel && (
                    <span className="text-xs text-muted-foreground">
                      {contentTypeLabel}
                    </span>
                  )}
                </div>
                <div className="flex-1 overflow-auto p-4 bg-background">
                  {bodyContent}
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-foreground" />
                <span className="text-sm text-muted-foreground">
                  Warte auf Response...
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
