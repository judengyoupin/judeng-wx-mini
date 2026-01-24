import type { GraphQLClientConfig,RequestListener ,RequestLifecycle} from "graphql-ormify-client";
import { graphqlOrmifyClientConfig as config } from "@/project-config";

// 获取动态 headers（包含 token）
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    ...config.headers,
  };
  
  // 从本地存储获取 token
  try {
    const token = uni.getStorageSync('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('获取 token 失败:', error);
  }
  
  return headers;
}

export const graphqlOrmifyClientConfig: GraphQLClientConfig = {
  endpoint: config.endpoint,
  headers: getHeaders(),
  debug: false,
};  

export const graphqlOrmifyClientRequestListener: RequestListener = {
  onRequest: (info: RequestLifecycle) => {
    // 在每次请求时动态更新 headers
    if (info.config?.headers) {
      const token = uni.getStorageSync('token');
      if (token) {
        info.config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    console.log("request-start", {id:info?.id,query: info?.config?.data?.query, variables: info?.config?.data?.variables});
  },
  onResponse: (info: RequestLifecycle) => {
    console.log("response-end", {id:info?.id,data: info?.response});
  },
};