import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';

export interface CompanyInput {
  name: string;
  logo_url?: string;
  banner_top?: any[];
  banner_bottom?: any[];
  /** 隐藏的分类 id 列表（系统默认公司展示时过滤） */
  hidden_category_ids?: number[];
  /** 隐藏的商品 id 列表（系统默认公司展示时过滤） */
  hidden_product_ids?: number[];
}

/**
 * 获取所有公司列表
 */
export async function getCompanyList(params: {
  limit?: number;
  offset?: number;
}) {
  const query = `
    query GetCompanyList($limit: Int, $offset: Int) {
      companies(
        limit: $limit
        offset: $offset
        order_by: { created_at: desc }
      ) {
        id
        name
        logo_url
        hidden_category_ids
        hidden_product_ids
        created_at
        updated_at
        company_users(
          where: { role: { _eq: "admin" } }
        ) {
          id
          user {
            id
            mobile
            nickname
          }
        }
      }
      companies_aggregate {
        aggregate {
          count
        }
      }
    }
  `;

  const result = await client.execute({
    query,
    variables: {
      limit: params.limit || 20,
      offset: params.offset || 0,
    },
  });

  return {
    companies: result?.companies || [],
    total: result?.companies_aggregate?.aggregate?.count || 0,
  };
}

/**
 * 获取公司详情
 */
export async function getCompanyDetail(companyId: number) {
  const query = `
    query GetCompanyDetail($companyId: bigint!) {
      companies_by_pk(id: $companyId) {
        id
        name
        logo_url
        banner_top
        banner_bottom
        hidden_category_ids
        hidden_product_ids
        created_at
        updated_at
        company_users(
          where: { role: { _eq: "admin" } }
        ) {
          id
          user {
            id
            mobile
            nickname
            avatar_url
          }
        }
      }
    }
  `;

  const result = await client.execute({
    query,
    variables: { companyId },
  });

  return result?.companies_by_pk;
}

/**
 * 创建公司
 */
export async function createCompany(company: CompanyInput) {
  const mutation = `
    mutation CreateCompany($company: companies_insert_input!) {
      insert_companies_one(object: $company) {
        id
        name
        logo_url
        created_at
      }
    }
  `;

  // 确保 banner_top、banner_bottom 至少是空数组；hidden_* 传数组
  const companyData = {
    ...company,
    banner_top: company.banner_top ?? [],
    banner_bottom: company.banner_bottom ?? [],
    hidden_category_ids: company.hidden_category_ids ?? [],
    hidden_product_ids: company.hidden_product_ids ?? [],
  };

  const result = await client.execute({
    query: mutation,
    variables: { company: companyData },
  });

  return result?.insert_companies_one;
}

/**
 * 更新公司
 */
export async function updateCompany(companyId: number, company: Partial<CompanyInput>) {
  const mutation = `
    mutation UpdateCompany($companyId: bigint!, $company: companies_set_input!) {
      update_companies_by_pk(pk_columns: { id: $companyId }, _set: $company) {
        id
        name
        updated_at
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: {
      companyId,
      company,
    },
  });

  return result?.update_companies_by_pk;
}

/**
 * 删除公司
 */
export async function deleteCompany(companyId: number) {
  const mutation = `
    mutation DeleteCompany($companyId: bigint!) {
      delete_companies_by_pk(id: $companyId) {
        id
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { companyId },
  });

  return result?.delete_companies_by_pk;
}

/**
 * 授权用户为公司管理员
 */
export async function authorizeCompanyAdmin(params: {
  userId: number;
  companyId: number;
  canViewPrice?: boolean;
  priceFactor?: number;
}) {
  const mutation = `
    mutation AuthorizeCompanyAdmin($user: company_users_insert_input!) {
      insert_company_users_one(
        object: $user
        on_conflict: {
          constraint: company_users_company_companies_user_users_key
          update_columns: [role, can_view_price, price_factor]
        }
      ) {
        id
        role
        can_view_price
        price_factor
        user {
          id
          mobile
          nickname
        }
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: {
      user: {
        user_users: params.userId,
        company_companies: params.companyId,
        role: 'admin',
        can_view_price: params.canViewPrice ?? true,
        price_factor: params.priceFactor ?? 1,
      },
    },
  });

  return result?.insert_company_users_one;
}

/**
 * 获取默认展示公司ID
 */
export async function getDefaultDisplayCompanyId(): Promise<number | null> {
  try {
    const query = `
      query GetDefaultCompanyIdConfig {
        configs(where: { name: { _eq: "default_company_id" } }, limit: 1) {
          id
          value
        }
      }
    `;

    const result = await client.execute({
      query,
    });

    if (!result?.configs || result.configs.length === 0) {
      return null;
    }

    const value = result.configs[0].value;
    
    // jsonb 可能是数字或对象
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    }
    
    if (typeof value === 'object' && value !== null) {
      if (typeof value.content === 'number') {
        return value.content;
      }
      if (typeof value.companyId === 'number') {
        return value.companyId;
      }
      if (typeof value.id === 'number') {
        return value.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('获取默认展示公司ID失败:', error);
    return null;
  }
}

/**
 * 设置默认展示公司ID
 */
export async function setDefaultDisplayCompanyId(companyId: number) {
  const mutation = `
    mutation SetDefaultDisplayCompanyId($companyId: jsonb!) {
      insert_configs_one(
        object: {
          name: "default_company_id"
          value: $companyId
          description: "小程序默认展示的公司ID"
          is_deletable: false
        }
        on_conflict: {
          constraint: configs_name_key
          update_columns: [value, updated_at]
        }
      ) {
        id
        name
        value
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { companyId },
  });

  return result?.insert_configs_one;
}

/**
 * 搜索用户（用于授权）
 */
export async function searchUserByMobileForPlatform(mobile: string) {
  const query = `
    query SearchUserByMobile($mobile: String!) {
      users(
        where: { mobile: { _eq: $mobile } }
        limit: 1
      ) {
        id
        mobile
        nickname
        avatar_url
        role
      }
    }
  `;

  const result = await client.execute({
    query,
    variables: { mobile },
  });

  return result?.users?.[0] || null;
}
