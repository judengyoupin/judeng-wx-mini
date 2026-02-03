import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import { setCompanyContext } from "@/store/userStore";

/** C 端公司公开信息（资料库、联系我们、关于我们等） */
export interface CompanyPublicInfo {
  id: number;
  name: string;
  logo_url?: string | null;
  description?: string | null;
  contact_code?: string | null;
  wechat_code?: string | null;
  resource_file_url?: string | null;
}

/**
 * 获取公司公开信息（用于资料库、联系我们、关于我们、订单详情展示微信等）
 */
export async function getCompanyPublicInfo(companyId: number): Promise<CompanyPublicInfo | null> {
  const query = `
    query GetCompanyPublicInfo($companyId: bigint!) {
      companies_by_pk(id: $companyId) {
        id
        name
        logo_url
        description
        contact_code
        wechat_code
        resource_file_url
      }
    }
  `;
  const result = await client.execute<{
    companies_by_pk: CompanyPublicInfo | null;
  }>({
    query,
    variables: { companyId },
  });
  return result?.companies_by_pk ?? null;
}

/**
 * 同步公司信息
 * 从后端获取公司信息并存储到全局状态
 */
export async function syncCompanyInfo(companyId: string | number) {
  try {
    const query = `
      query GetCompanyInfo($companyId: bigint!) {
        companies_by_pk(id: $companyId) {
          id
          name
          logo_url
        }
      }
    `;

    const result = await client.execute<{
      companies_by_pk: {
        id: number;
        name: string;
        logo_url?: string | null;
      } | null;
    }>({
      query,
      variables: { companyId: Number(companyId) },
    });

    if (!result.companies_by_pk) {
      console.warn("公司信息不存在:", companyId);
      return null;
    }

    const company = {
      id: result.companies_by_pk.id,
      name: result.companies_by_pk.name,
      logo_url: result.companies_by_pk.logo_url,
    };

    // 设置到全局状态
    setCompanyContext(company);

    return company;
  } catch (error: any) {
    console.error("同步公司信息失败:", error);
    throw error;
  }
}
