import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';

export interface PackageInput {
  name: string;
  cover_image_url: string;
  description?: string;
  category_categories?: number;
}

export interface PackageProductSkuInput {
  package_packages: number;
  product_sku_product_skus: number;
  quantity: number;
}

/**
 * 获取套餐列表（可选按公司筛选）
 */
export async function getPackageList(params: {
  companyId?: number;
  limit?: number;
  offset?: number;
}) {
  const hasCompany = params.companyId != null;
  const whereStr = hasCompany ? 'where: { company_companies: { _eq: $companyId } }, ' : '';
  const query = `
    query GetPackageList($limit: Int, $offset: Int${hasCompany ? ', $companyId: bigint!' : ''}) {
      packages(
        ${whereStr}limit: $limit
        offset: $offset
        order_by: { created_at: desc }
      ) {
        id
        name
        cover_image_url
        description
        category_categories
        category {
          id
          name
        }
        created_at
        updated_at
        package_product_skus {
          id
          quantity
          product_sku {
            id
            name
            price
            product {
              name
            }
          }
        }
      }
      packages_aggregate(
        ${whereStr.replace(', ', '')}
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
  if (hasCompany) {
    variables.companyId = params.companyId;
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
        category_categories
        category {
          id
          name
        }
        created_at
        updated_at
        package_product_skus {
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
    }
  `;

  const result = await client.execute({
    query,
    variables: { packageId },
  });

  return result?.packages_by_pk;
}

/**
 * 创建套餐
 */
export async function createPackage(packageData: PackageInput) {
  const mutation = `
    mutation CreatePackage($package: packages_insert_input!) {
      insert_packages_one(object: $package) {
        id
        name
        cover_image_url
        created_at
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { package: packageData },
  });

  return result?.insert_packages_one;
}

/**
 * 更新套餐
 */
export async function updatePackage(packageId: number, packageData: Partial<PackageInput>) {
  const mutation = `
    mutation UpdatePackage($packageId: bigint!, $package: packages_set_input!) {
      update_packages_by_pk(pk_columns: { id: $packageId }, _set: $package) {
        id
        name
        updated_at
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: {
      packageId,
      package: packageData,
    },
  });

  return result?.update_packages_by_pk;
}

/**
 * 删除套餐
 */
export async function deletePackage(packageId: number) {
  const mutation = `
    mutation DeletePackage($packageId: bigint!) {
      delete_packages_by_pk(id: $packageId) {
        id
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { packageId },
  });

  return result?.delete_packages_by_pk;
}

/**
 * 添加套餐SKU
 */
export async function addPackageSku(sku: PackageProductSkuInput) {
  const mutation = `
    mutation AddPackageSku($sku: package_product_skus_insert_input!) {
      insert_package_product_skus_one(object: $sku) {
        id
        quantity
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { sku },
  });

  return result?.insert_package_product_skus_one;
}

/**
 * 更新套餐SKU
 */
export async function updatePackageSku(skuId: number, quantity: number) {
  const mutation = `
    mutation UpdatePackageSku($skuId: bigint!, $quantity: bigint!) {
      update_package_product_skus_by_pk(
        pk_columns: { id: $skuId }
        _set: { quantity: $quantity }
      ) {
        id
        quantity
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { skuId, quantity },
  });

  return result?.update_package_product_skus_by_pk;
}

/**
 * 删除套餐SKU
 */
export async function deletePackageSku(skuId: number) {
  const mutation = `
    mutation DeletePackageSku($skuId: bigint!) {
      delete_package_product_skus_by_pk(id: $skuId) {
        id
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { skuId },
  });

  return result?.delete_package_product_skus_by_pk;
}
