import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';

export interface CategoryInput {
  name: string;
  icon_url: string;
  company_companies: number;
  parent_categories?: number;
  level: number;
  route_ui_style: 'categories' | 'products';
  sort_order: number;
}

/**
 * 获取分类树
 */
export async function getCategoryTree(companyId: number) {
  const query = `
    query GetCategoryTree($companyId: bigint!) {
      categories(
        where: {
          company_companies: { _eq: $companyId }
          is_deleted: { _eq: false }
        }
        order_by: { sort_order: asc }
      ) {
        id
        name
        icon_url
        parent_categories
        level
        route_ui_style
        sort_order
        categories(
          where: { is_deleted: { _eq: false } }
          order_by: { sort_order: asc }
        ) {
          id
          name
          icon_url
          parent_categories
          level
          route_ui_style
          sort_order
        }
      }
    }
  `;

  const result = await client.execute({
    query,
    variables: { companyId },
  });

  return result?.categories || [];
}

/**
 * 创建分类
 */
export async function createCategory(category: CategoryInput) {
  const mutation = `
    mutation CreateCategory($category: categories_insert_input!) {
      insert_categories_one(object: $category) {
        id
        name
        icon_url
        level
        sort_order
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { category },
  });

  return result?.insert_categories_one;
}

/**
 * 更新分类
 */
export async function updateCategory(categoryId: number, category: Partial<CategoryInput>) {
  const mutation = `
    mutation UpdateCategory($categoryId: bigint!, $category: categories_set_input!) {
      update_categories_by_pk(pk_columns: { id: $categoryId }, _set: $category) {
        id
        name
        icon_url
        updated_at
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: {
      categoryId,
      category,
    },
  });

  return result?.update_categories_by_pk;
}

/**
 * 删除分类（软删除）
 */
export async function deleteCategory(categoryId: number) {
  const mutation = `
    mutation DeleteCategory($categoryId: bigint!) {
      update_categories_by_pk(
        pk_columns: { id: $categoryId }
        _set: { is_deleted: true }
      ) {
        id
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: { categoryId },
  });

  return result?.update_categories_by_pk;
}
