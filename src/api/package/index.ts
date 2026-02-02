import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';
import { companyInfo } from '@/store/userStore';
import { getDefaultCompanyId } from '@/api/config/index';

/**
 * 获取套餐列表（前端展示）
 * 合并当前公司和默认公司的套餐数据
 */
export async function getPackageList(params: {
  companyId?: number;
  categoryId?: number;
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
      packages: [],
      total: 0,
    };
  }

  // 构建公司过滤条件
  const companyFilter = companyIds.length === 1
    ? 'company_companies: { _eq: $companyId }'
    : 'company_companies: { _in: $companyIds }';

  // 构建where条件数组
  const whereConditions: string[] = [
    `package_product_skus: {
              product_sku: {
                ${companyFilter}
                is_deleted: { _eq: false }
                is_shelved: { _eq: false }
              }
            }`,
  ];

  // 如果指定了分类ID，添加分类过滤条件
  if (params.categoryId) {
    whereConditions.push(`category_categories: { _eq: $categoryId }`);
  }

  // 构建where子句（_and 的每一项必须是对象，需用 {} 包裹）
  const whereClause = whereConditions.length > 1
    ? `_and: [
            ${whereConditions.map((c) => `{ ${c} }`).join(',\n            ')}
          ]`
    : whereConditions[0];

  const query = companyIds.length === 1
    ? `
      query GetPackageList($companyId: bigint!, $limit: Int, $offset: Int${params.categoryId ? ', $categoryId: bigint!' : ''}) {
        packages(
          where: {
            ${whereClause}
          }
          limit: $limit
          offset: $offset
          order_by: { created_at: desc }
        ) {
          id
          name
          cover_image_url
          description
          created_at
          package_product_skus(
            where: {
              product_sku: {
                is_deleted: { _eq: false }
                is_shelved: { _eq: false }
              }
            }
          ) {
            id
            quantity
            product_sku {
              id
              name
              price
              image_url
              product {
                id
                name
                cover_image_url
              }
            }
          }
        }
        packages_aggregate(
          where: {
            ${whereClause}
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `
    : `
      query GetPackageList($companyIds: [bigint!]!, $limit: Int, $offset: Int${params.categoryId ? ', $categoryId: bigint!' : ''}) {
        packages(
          where: {
            ${whereClause}
          }
          limit: $limit
          offset: $offset
          order_by: { created_at: desc }
        ) {
          id
          name
          cover_image_url
          description
          created_at
          package_product_skus(
            where: {
              product_sku: {
                is_deleted: { _eq: false }
                is_shelved: { _eq: false }
              }
            }
          ) {
            id
            quantity
            product_sku {
              id
              name
              price
              image_url
              product {
                id
                name
                cover_image_url
              }
            }
          }
        }
        packages_aggregate(
          where: {
            ${whereClause}
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `;

  const variables: any = {
    limit: params.limit || 20,
    offset: params.offset || 0,
  };
  
  if (companyIds.length === 1) {
    variables.companyId = companyIds[0];
  } else {
    variables.companyIds = companyIds;
  }

  // 如果指定了分类ID，添加到变量中
  if (params.categoryId) {
    variables.categoryId = params.categoryId;
  }

  const result = await client.execute({
    query,
    variables,
  });

  return {
    packages: result?.packages || [],
    total: result?.packages_aggregate?.aggregate?.count || 0,
  };
}

/**
 * 获取套餐详情
 */
export async function getPackageDetail(packageId: number) {
  const query = `
    query GetPackageDetail($packageId: bigint!) {
      packages_by_pk(id: $packageId) {
        id
        name
        cover_image_url
        description
        created_at
        updated_at
        package_product_skus(
          where: {
            product_sku: {
              is_deleted: { _eq: false }
            }
          }
        ) {
          id
          quantity
          product_sku {
            id
            name
            price
            stock
            image_url
            is_shelved
            product {
              id
              name
              cover_image_url
            }
          }
        }
      }
    }
  `;

  const result = await client.execute({
    query,
    variables: { packageId },
  });

  return result?.packages_by_pk;
}
