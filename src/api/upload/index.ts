/**
 * 获取七牛云上传凭证
 * @param apiBaseUrl 后端 API 地址（可选，默认从项目配置读取）
 * @returns 上传凭证和配置信息
 */
export const get_upload_token = async (
  apiBaseUrl?: string
): Promise<{
  token: string;
  bucket: string;
  baseUrl?: string;
  dirPath?: string;
  uploadUrl: string;
}> => {
  // 替换为你的后端 API 地址，建议在项目配置中统一管理
  const API_BASE_URL = apiBaseUrl || 'http://localhost:3000';
  
  const response = await uni.request({
    url: `${API_BASE_URL}/api/qiniu-upload/token`,
    method: 'GET',
    header: {
      'Content-Type': 'application/json',
    },
  });

  console.log('获取 token 响应:', {
    statusCode: response.statusCode,
    data: response.data,
  });

  const data = response.data as {
    success: boolean;
    message?: string;
    data: {
      token: string;
      bucket: string;
      baseUrl?: string;
      dirPath?: string;
      uploadUrl: string;
    };
  };

  if (response.statusCode !== 200 || !data?.success) {
    const errorMsg = data?.message || `获取上传凭证失败 (HTTP ${response.statusCode})`;
    console.error('获取 token 失败:', errorMsg, data);
    throw new Error(errorMsg);
  }

  if (!data.data?.token) {
    throw new Error('获取的上传凭证无效：token 为空');
  }

  return data.data;
};

/**
 * 上传文件到七牛云（带进度）
 * @param filePath 文件路径
 * @param token 上传凭证
 * @param key 文件 key
 * @param uploadUrl 上传地址
 * @param onProgress 进度回调
 * @returns 上传结果
 */
/**
 * 上传文件（便捷方法）
 */
export const uploadFile = async (
  filePath: string, 
  onProgress?: (progress: number) => void
): Promise<string> => {
  const tokenInfo = await get_upload_token();
  const key = `${tokenInfo.dirPath || ''}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const result = await upload_to_qiniu(filePath, tokenInfo.token, key, tokenInfo.uploadUrl, onProgress);
  // 拼接完整URL
  if (tokenInfo.baseUrl) {
    return `${tokenInfo.baseUrl}/${result.key}`;
  }
  return result.key;
};

export const upload_to_qiniu = async (
  filePath: string,
  token: string,
  key: string,
  uploadUrl: string,
  onProgress?: (progress: number) => void
): Promise<{ url?: string; key: string }> => {
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: uploadUrl,
      filePath,
      name: 'file', // 七牛云上传接口要求文件字段名为 'file'
      formData: {
        token,
        key, // 文件在七牛云中的 key
      },
      success: (res) => {
        console.log('上传响应:', {
          statusCode: res.statusCode,
          data: res.data,
        });

        // 检查状态码
        if (res.statusCode !== 200) {
          try {
            const errorData = JSON.parse(res.data as string);
            const errorMsg =
              errorData.error ||
              errorData.message ||
              errorData.error_code ||
              `上传失败：HTTP ${res.statusCode}`;
            console.error('上传失败:', errorData);
            reject(new Error(errorMsg));
          } catch {
            reject(new Error(`上传失败：HTTP ${res.statusCode}`));
          }
          return;
        }

        try {
          const data = JSON.parse(res.data as string);
          console.log('解析后的响应数据:', data);
          
          // 七牛云成功响应会返回 { key: "xxx", hash: "xxx" } 格式
          if (data.key) {
            resolve({
              key: data.key,
              url: data.key, // 可以根据 baseUrl 拼接完整 URL
            });
          } else if (data.error) {
            // 处理错误响应
            const errorMsg = data.error || data.error_code || '上传失败';
            console.error('七牛云返回错误:', data);
            reject(new Error(errorMsg));
          } else {
            console.error('响应数据格式异常:', data);
            reject(new Error('上传失败：响应数据异常'));
          }
        } catch (error) {
          // 如果解析失败，可能是响应格式不对
          console.error('解析响应失败:', res.data, error);
          reject(new Error('解析响应数据失败'));
        }
      },
      fail: (error) => {
        console.error('上传请求失败:', error);
        reject(new Error(error.errMsg || '上传失败'));
      },
      // @ts-ignore - uni-app 类型定义可能不完整
      onProgressUpdate: (progressEvent) => {
        if (onProgress && progressEvent.totalBytesExpectedToWrite) {
          const percent = Math.round(
            (progressEvent.totalBytesWritten /
              progressEvent.totalBytesExpectedToWrite) *
              100
          );
          onProgress(percent);
        }
      },
    });
  });
};
