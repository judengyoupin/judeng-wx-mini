import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';
import { companyInfo } from '@/store/userStore';

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
 */
export async function getProductList(params: {
  companyId?: number;
  categoryId?: number;
  keyword?: string;
  limit?: number;
  offset?: number;
}) {
  const companyId = params.companyId || companyInfo.value?.id;
  
  if (!companyId) {
    return {
      products: [],
      total: 0,
    };
  }

  // 动态构建 where 条件
  const whereConditions: string[] = [
    '{ company_companies: { _eq: $companyId } }',
    '{ is_deleted: { _eq: false } }',
    '{ is_shelved: { _eq: false } }',
  ];

  if (params.categoryId) {
    whereConditions.push('{ category_categories: { _eq: $categoryId } }');
  }

  if (params.keyword && params.keyword.trim()) {
    whereConditions.push(`{ name: { _ilike: $keyword } }`);
  }

  // 根据条件动态构建查询
  const hasCategory = !!params.categoryId;
  const hasKeyword = !!(params.keyword && params.keyword.trim());

  let query = '';
  let variables: any = {
    companyId,
    limit: params.limit || 20,
    offset: params.offset || 0,
  };

  if (hasCategory && hasKeyword) {
    query = `
      query GetProductList(
        $companyId: bigint!
        $categoryId: bigint!
        $keyword: String!
        $limit: Int
        $offset: Int
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
    query = `
      query GetProductList(
        $companyId: bigint!
        $categoryId: bigint!
        $limit: Int
        $offset: Int
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
    query = `
      query GetProductList(
        $companyId: bigint!
        $keyword: String!
        $limit: Int
        $offset: Int
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
    query = `
      query GetProductList(
        $companyId: bigint!
        $limit: Int
        $offset: Int
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
