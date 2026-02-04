import { ref } from 'vue';
import { uploadFile } from '@/api/upload';

/**
 * 带实时进度条的图片上传（选择 + 上传，统一进度状态）
 * 管理页多处复用：选择图片后上传并更新 progress，便于展示进度条。
 */
export function useImageUploadWithProgress() {
  const uploading = ref(false);
  const progress = ref(0);

  /**
   * 选择一张图片并上传，带进度回调
   * @param options.ext 文件后缀，默认 '.jpg'
   * @returns 上传成功后的 URL，失败则 reject
   */
  function chooseAndUploadImage(options: { ext?: string } = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0];
          uploading.value = true;
          progress.value = 0;
          try {
            const url = await uploadFile(
              tempFilePath,
              (p) => {
                progress.value = p;
              },
              options.ext ?? '.jpg'
            );
            resolve(url);
          } catch (err: any) {
            reject(err);
          } finally {
            uploading.value = false;
            progress.value = 0;
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || '取消选择'));
        },
      });
    });
  }

  /**
   * 上传已有路径（如从 chooseMessageFile 得到），带进度
   * 用于非图片文件（PDF 等）或已有 path 的场景
   */
  async function uploadWithProgress(
    filePath: string,
    ext: string
  ): Promise<string> {
    uploading.value = true;
    progress.value = 0;
    try {
      const url = await uploadFile(
        filePath,
        (p) => {
          progress.value = p;
        },
        ext
      );
      return url;
    } finally {
      uploading.value = false;
      progress.value = 0;
    }
  }

  return {
    uploading,
    progress,
    chooseAndUploadImage,
    uploadWithProgress,
  };
}
