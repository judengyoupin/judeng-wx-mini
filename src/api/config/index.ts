import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";

/**
 * 获取配置值
 * @param configName 配置名称
 * @returns 配置值（可能是 string、number、array 或 object）
 */
export async function getConfig(configName: string): Promise<any> {
  try {
    const query = `
      query GetConfig($name: String!) {
        configs(where: { name: { _eq: $name } }, limit: 1) {
          id
          name
          value
          description
        }
      }
    `;

    const result = await client.execute({
      query,
      variables: { name: configName },
    });

    if (result?.configs && result.configs.length > 0) {
      return result.configs[0].value;
    }

    return null;
  } catch (error) {
    console.error(`获取配置失败 [${configName}]:`, error);
    return null;
  }
}

/**
 * 获取默认公司ID
 * @returns 默认公司ID（number），如果配置不存在则返回 null
 */
export async function getDefaultCompanyId(): Promise<number | null> {
  try {
    const value = await getConfig("default_company_id");
    
    if (value === null || value === undefined) {
      return null;
    }

    // value 可能是 JSON 对象，需要提取实际的值
    // 根据 configs 表的说明，value 是 jsonb，可能的结构：
    // - 直接是数字: 545
    // - 对象: { type: "number", content: 545 }
    // - 对象: { companyId: 545 }
    
    if (typeof value === "number") {
      return value;
    }
    
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    }
    
    if (typeof value === "object" && value !== null) {
      // 尝试从对象中提取值
      if (typeof value.content === "number") {
        return value.content;
      }
      if (typeof value.companyId === "number") {
        return value.companyId;
      }
      if (typeof value.id === "number") {
        return value.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error("获取默认公司ID失败:", error);
    return null;
  }
}
