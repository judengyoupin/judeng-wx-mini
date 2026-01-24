import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';
import { companyInfo } from '@/store/userStore';

/**
 * 获取套餐列表（前端展示）
 */
export async function getPackageList(params: {
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const companyId = params.companyId || companyInfo.value?.id;
  
  if (!companyId) {
    return {
      packages: [],
      total: 0,
    };
  }

  const query = `
    query GetPackageList($companyId: bigint!, $limit: Int, $offset: Int) {
      packages(
        where: {
          package_product_skus: {
            product_sku: {
              company_companies: { _eq: $companyId }
              is_deleted: { _eq: false }
              is_shelved: { _eq: false }
            }
          }
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
          package_product_skus: {
            product_sku: {
              company_companies: { _eq: $companyId }
              is_deleted: { _eq: false }
              is_shelved: { _eq: false }
            }
          }
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `;

  const result = await client.execute({
    query,
    variables: {
      companyId,
      limit: params.limit || 20,
      offset: params.offset || 0,
    },
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
