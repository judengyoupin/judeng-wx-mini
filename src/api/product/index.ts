import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';
import { companyInfo } from '@/store/userStore';
import { getDefaultCompanyId } from '@/api/config/index';

/**
 * 获取商品详情（前端展示）
 */
export async function getProductDetail(productId: number) {
  const query = `
    query GetProductDetail($productId: bigint!) {
      products_by_pk(id: $productId) {
        id
        name
        cover_image_url
        description
        video_url
        detail_medias
        scene_medias
        category_categories
        company_companies
        is_shelved
        created_at
        updated_at
        product_skus(
          where: { 
            is_deleted: { _eq: false }
            is_shelved: { _eq: false }
          }
          order_by: { created_at: asc }
        ) {
          id
          name
          image_url
          price
          stock
          is_shelved
        }
      }
    }
  `;

  const result = await client.execute({
    query,
    variables: { productId },
  });

  return result?.products_by_pk;
}

/**
 * 获取商品列表（前端展示）
 * 合并当前公司和默认公司的商品数据
 */
export async function getProductList(params: {
  companyId?: number;
  categoryId?: number;
  keyword?: string;
  limit?: number;
  offset?: number;
}) {
  const currentCompanyId = params.companyId || companyInfo.value?.id;
  
  // 获取默认公司ID
  const defaultCompanyId = await getDefaultCompanyId();
  
  // 确定要查询的公司ID列表（去重）
  const companyIds: number[] = [];
  if (currentCompanyId) {
    companyIds.push(currentCompanyId);
  }
  if (defaultCompanyId && defaultCompanyId !== currentCompanyId) {
    companyIds.push(defaultCompanyId);
  }
  
  // 如果没有公司ID，返回空
  if (companyIds.length === 0) {
    return {
      products: [],
      total: 0,
    };
  }

  // 若包含默认公司，获取其隐藏商品 id 列表（展示时过滤）
  let hiddenProductIds: number[] = [];
  if (defaultCompanyId && companyIds.includes(defaultCompanyId)) {
    try {
      const hideRes = await client.execute<{ companies_by_pk: { hidden_product_ids: (string | number)[] | null } | null }>({
        query: `query GetDefaultCompanyHiddenProducts($id: bigint!) {
          companies_by_pk(id: $id) { hidden_product_ids }
        }`,
        variables: { id: defaultCompanyId },
      });
      const arr = hideRes?.companies_by_pk?.hidden_product_ids;
      hiddenProductIds = Array.isArray(arr) ? arr.map((id) => Number(id)) : [];
    } catch (_) {
      // 忽略错误，按不隐藏处理
    }
  }

  // 动态构建 where 条件
  const whereConditions: string[] = [];

  // 添加公司过滤条件
  if (companyIds.length === 1) {
    whereConditions.push('{ company_companies: { _eq: $companyId } }');
  } else {
    whereConditions.push('{ company_companies: { _in: $companyIds } }');
  }

  whereConditions.push('{ is_deleted: { _eq: false } }');
  whereConditions.push('{ is_shelved: { _eq: false } }');

  if (hiddenProductIds.length > 0) {
    whereConditions.push('{ id: { _nin: $hiddenProductIds } }');
  }

  if (params.categoryId) {
    whereConditions.push('{ category_categories: { _eq: $categoryId } }');
  }

  if (params.keyword && params.keyword.trim()) {
    whereConditions.push(`{ name: { _ilike: $keyword } }`);
  }

  // 根据条件动态构建查询
  const hasCategory = !!params.categoryId;
  const hasKeyword = !!(params.keyword && params.keyword.trim());
  const hasMultipleCompanies = companyIds.length > 1;

  let query = '';
  let variables: any = {
    limit: params.limit || 20,
    offset: params.offset || 0,
  };
  
  // 根据公司数量设置变量
  if (hasMultipleCompanies) {
    variables.companyIds = companyIds;
  } else {
    variables.companyId = companyIds[0];
  }
  if (hiddenProductIds.length > 0) {
    variables.hiddenProductIds = hiddenProductIds;
  }
  const hiddenVars = hiddenProductIds.length > 0 ? ', $hiddenProductIds: [bigint!]!' : '';

  if (hasCategory && hasKeyword) {
    const queryVars = hasMultipleCompanies
      ? `$companyIds: [bigint!]!, $categoryId: bigint!, $keyword: String!, $limit: Int, $offset: Int${hiddenVars}`
      : `$companyId: bigint!, $categoryId: bigint!, $keyword: String!, $limit: Int, $offset: Int${hiddenVars}`;
    
    query = `
      query GetProductList(
        ${queryVars}
      ) {
        products(
          where: {
            _and: [
              ${whereConditions.join(',\n              ')}
            ]
          }
          limit: $limit
          offset: $offset
          order_by: { created_at: desc }
        ) {
          id
          name
          cover_image_url
          description
          category_categories
          product_skus(
            where: { 
              is_deleted: { _eq: false }
              is_shelved: { _eq: false }
            }
            limit: 1
          ) {
            id
            price
          }
        }
        products_aggregate(
          where: {
            _and: [
              ${whereConditions.join(',\n              ')}
            ]
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `;
    variables.categoryId = params.categoryId;
    variables.keyword = `%${params.keyword.trim()}%`;
  } else if (hasCategory) {
    const queryVars = hasMultipleCompanies
      ? `$companyIds: [bigint!]!, $categoryId: bigint!, $limit: Int, $offset: Int${hiddenVars}`
      : `$companyId: bigint!, $categoryId: bigint!, $limit: Int, $offset: Int${hiddenVars}`;
    
    query = `
      query GetProductList(
        ${queryVars}
      ) {
        products(
          where: {
            _and: [
              ${whereConditions.join(',\n              ')}
            ]
          }
          limit: $limit
          offset: $offset
          order_by: { created_at: desc }
        ) {
          id
          name
          cover_image_url
          description
          category_categories
          product_skus(
            where: { 
              is_deleted: { _eq: false }
              is_shelved: { _eq: false }
            }
            limit: 1
          ) {
            id
            price
          }
        }
        products_aggregate(
          where: {
            _and: [
              ${whereConditions.join(',\n              ')}
            ]
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `;
    variables.categoryId = params.categoryId;
  } else if (hasKeyword) {
    const queryVars = hasMultipleCompanies
      ? `$companyIds: [bigint!]!, $keyword: String!, $limit: Int, $offset: Int${hiddenVars}`
      : `$companyId: bigint!, $keyword: String!, $limit: Int, $offset: Int${hiddenVars}`;
    
    query = `
      query GetProductList(
        ${queryVars}
      ) {
        products(
          where: {
            _and: [
              ${whereConditions.join(',\n              ')}
            ]
          }
          limit: $limit
          offset: $offset
          order_by: { created_at: desc }
        ) {
          id
          name
          cover_image_url
          description
          category_categories
          product_skus(
            where: { 
              is_deleted: { _eq: false }
              is_shelved: { _eq: false }
            }
            limit: 1
          ) {
            id
            price
          }
        }
        products_aggregate(
          where: {
            _and: [
              ${whereConditions.join(',\n              ')}
            ]
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `;
    variables.keyword = `%${params.keyword.trim()}%`;
  } else {
    const queryVars = hasMultipleCompanies
      ? `$companyIds: [bigint!]!, $limit: Int, $offset: Int${hiddenVars}`
      : `$companyId: bigint!, $limit: Int, $offset: Int${hiddenVars}`;
    
    query = `
      query GetProductList(
        ${queryVars}
      ) {
        products(
          where: {
            _and: [
              ${whereConditions.join(',\n              ')}
            ]
          }
          limit: $limit
          offset: $offset
          order_by: { created_at: desc }
        ) {
          id
          name
          cover_image_url
          description
          category_categories
          product_skus(
            where: { 
              is_deleted: { _eq: false }
              is_shelved: { _eq: false }
            }
            limit: 1
          ) {
            id
            price
          }
        }
        products_aggregate(
          where: {
            _and: [
              ${whereConditions.join(',\n              ')}
            ]
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `;
  }

  const result = await client.execute({
    query,
    variables,
  });

  return {
    products: result?.products || [],
    total: result?.products_aggregate?.aggregate?.count || 0,
  };
}
