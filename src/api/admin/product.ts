import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';

export interface ProductInput {
  name: string;
  cover_image_url: string;
  description?: string;
  detail_medias?: Array<{ file_type: string; file_url: string }>;
  scene_medias?: Array<{ file_type: string; file_url: string }>;
  category_categories?: number;
  company_companies: number;
  is_shelved?: boolean;
  tags?: string;
}

export interface ProductSkuInput {
  name: string;
  image_url?: string;
  price: number;
  stock: number;
  product_products: number;
  company_companies: number;
  is_shelved?: boolean;
}

/**
 * 获取商品列表
 */
export async function getProductList(params: {
  companyId: number;
  categoryId?: number;
  limit?: number;
  offset?: number;
}) {
  // 动态构建 where 条件
  const whereConditions: string[] = [
    '{ company_companies: { _eq: $companyId } }',
    '{ is_deleted: { _eq: false } }',
  ];

  if (params.categoryId) {
    whereConditions.push('{ category_categories: { _eq: $categoryId } }');
  }

  // 根据是否有 categoryId 动态构建查询
  const query = params.categoryId
    ? `
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
          tags
          detail_medias
          scene_medias
          category_categories
          is_shelved
          created_at
          updated_at
          category {
            id
            name
            category {
              id
              name
              category {
                id
                name
              }
            }
          }
          product_skus(
            where: { is_deleted: { _eq: false } }
          ) {
            id
            name
            price
            stock
            is_shelved
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
    `
    : `
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
          tags
          detail_medias
          scene_medias
          category_categories
          is_shelved
          created_at
          updated_at
          category {
            id
            name
            category {
              id
              name
              category {
                id
                name
              }
            }
          }
          product_skus(
            where: { is_deleted: { _eq: false } }
          ) {
            id
            name
            price
            stock
            is_shelved
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

  const variables: any = {
    companyId: params.companyId,
    limit: params.limit || 20,
    offset: params.offset || 0,
  };

  if (params.categoryId) {
    variables.categoryId = params.categoryId;
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

/**
 * 获取商品详情
 */
export async function getProductDetail(productId: number) {
  const query = `
    query GetProductDetail($productId: bigint!) {
      products_by_pk(id: $productId) {
        id
        name
        cover_image_url
        description
        tags
        detail_medias
        scene_medias
        category_categories
        company_companies
        is_shelved
        created_at
        updated_at
        product_skus(
          where: { is_deleted: { _eq: false } }
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
 * 创建商品
 */
export async function createProduct(product: ProductInput) {
  const mutation = `
    mutation CreateProduct($product: products_insert_input!) {
      insert_products_one(object: $product) {
        id
        name
        cover_image_url
        created_at
      }
    }
  `;

  // 确保 detail_medias 和 scene_medias 是有效的 JSONB 数组
  const productData: any = {
    name: product.name,
    cover_image_url: product.cover_image_url,
    company_companies: product.company_companies,
    is_shelved: product.is_shelved ?? false,
    detail_medias: Array.isArray(product.detail_medias) && product.detail_medias.length > 0 
      ? product.detail_medias 
      : [],
    scene_medias: Array.isArray(product.scene_medias) && product.scene_medias.length > 0 
      ? product.scene_medias 
      : [],
  };

  // 可选字段，只在有值时才添加
  if (product.description !== undefined && product.description !== null && product.description !== '') {
    productData.description = product.description;
  }
  
  if (product.tags !== undefined && product.tags !== null) {
    productData.tags = product.tags;
  }
  if (product.category_categories !== undefined && product.category_categories !== null) {
    productData.category_categories = product.category_categories;
  }

  const result = await client.execute({
    query: mutation,
    variables: {
      product: productData,
    },
  });

  return result?.insert_products_one;
}

/**
 * 更新商品
 */
export async function updateProduct(productId: number, product: Partial<ProductInput>) {
  const mutation = `
    mutation UpdateProduct($productId: bigint!, $product: products_set_input!) {
      update_products_by_pk(pk_columns: { id: $productId }, _set: $product) {
        id
        name
        updated_at
      }
    }
  `;

  // 确保 detail_medias 和 scene_medias 是有效的 JSONB 数组
  const productData: any = {};
  
  // 只添加有值的字段
  if (product.name !== undefined) productData.name = product.name;
  if (product.cover_image_url !== undefined) productData.cover_image_url = product.cover_image_url;
  if (product.is_shelved !== undefined) productData.is_shelved = product.is_shelved;
  if (product.description !== undefined && product.description !== null && product.description !== '') {
    productData.description = product.description;
  }
  if (product.tags !== undefined && product.tags !== null) {
    productData.tags = product.tags;
  }
  if (product.category_categories !== undefined && product.category_categories !== null) {
    productData.category_categories = product.category_categories;
  }
  
  // JSONB 数组字段，确保是数组格式
  if (product.detail_medias !== undefined) {
    productData.detail_medias = Array.isArray(product.detail_medias) && product.detail_medias.length > 0 
      ? product.detail_medias 
      : [];
  }
  
  if (product.scene_medias !== undefined) {
    productData.scene_medias = Array.isArray(product.scene_medias) && product.scene_medias.length > 0 
      ? product.scene_medias 
      : [];
  }

  const result = await client.execute({
    query: mutation,
    variables: {
      productId,
      product: productData,
    },
  });

  return result?.update_products_by_pk;
}

/**
 * 删除商品（软删除）
 */
export async function deleteProduct(productId: number) {
  const mutation = `
    mutation DeleteProduct($productId: bigint!) {
      update_products_by_pk(
        pk_columns: { id: $productId }
        _set: { is_deleted: true }
      ) {
        id
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { productId },
  });

  return result?.update_products_by_pk;
}

/**
 * 创建商品规格（SKU）
 */
export async function createProductSku(sku: ProductSkuInput) {
  const mutation = `
    mutation CreateProductSku($sku: product_skus_insert_input!) {
      insert_product_skus_one(object: $sku) {
        id
        name
        price
        stock
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: {
      sku: {
        ...sku,
        is_shelved: sku.is_shelved ?? false,
      },
    },
  });

  return result?.insert_product_skus_one;
}

/**
 * 更新商品规格（SKU）
 */
export async function updateProductSku(skuId: number, sku: Partial<ProductSkuInput>) {
  const mutation = `
    mutation UpdateProductSku($skuId: bigint!, $sku: product_skus_set_input!) {
      update_product_skus_by_pk(pk_columns: { id: $skuId }, _set: $sku) {
        id
        name
        price
        stock
        updated_at
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: {
      skuId,
      sku,
    },
  });

  return result?.update_product_skus_by_pk;
}

/**
 * 删除商品规格（软删除）
 */
export async function deleteProductSku(skuId: number) {
  const mutation = `
    mutation DeleteProductSku($skuId: bigint!) {
      update_product_skus_by_pk(
        pk_columns: { id: $skuId }
        _set: { is_deleted: true }
      ) {
        id
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { skuId },
  });

  return result?.update_product_skus_by_pk;
}
