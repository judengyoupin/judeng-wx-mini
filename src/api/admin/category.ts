import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';

export interface CategoryInput {
  name: string;
  icon_url: string;
  company_companies: number;
  parent_categories?: number;
  level: number;
  route_ui_style: 'categories' | 'products';
  sort_order: number;
  type: 'product' | 'package';
}

/**
 * 获取分类树（一次请求返回三层：根 → 二级 → 三级，仅查根节点，子节点通过嵌套 relation 获取）
 */
export async function getCategoryTree(companyId: number) {
  const query = `
    query GetCategoryTree($companyId: bigint!) {
      categories(
        where: {
          company_companies: { _eq: $companyId }
          is_deleted: { _eq: false }
          parent_categories: { _is_null: true }
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
        type
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
          type
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
            type
          }
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
 * 显式传入 type，避免被 schema 或序列化漏掉
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
        type
      }
    }
  `;

  const payload = {
    name: category.name,
    icon_url: category.icon_url,
    company_companies: category.company_companies,
    parent_categories: category.parent_categories ?? null,
    level: category.level,
    route_ui_style: category.route_ui_style,
    sort_order: category.sort_order,
    type: category.type,
  };

  const result = await client.execute({
    query: mutation,
    variables: { category: payload },
  });

  return result?.insert_categories_one;
}

/**
 * 更新分类
 * 显式传入 type，避免被漏掉
 */
export async function updateCategory(categoryId: number, category: Partial<CategoryInput>) {
  const mutation = `
    mutation UpdateCategory($categoryId: bigint!, $category: categories_set_input!) {
      update_categories_by_pk(pk_columns: { id: $categoryId }, _set: $category) {
        id
        name
        icon_url
        updated_at
        type
      }
    }
  `;

  const payload: Record<string, unknown> = {};
  if (category.name !== undefined) payload.name = category.name;
  if (category.icon_url !== undefined) payload.icon_url = category.icon_url;
  if (category.company_companies !== undefined) payload.company_companies = category.company_companies;
  if (category.parent_categories !== undefined) payload.parent_categories = category.parent_categories;
  if (category.level !== undefined) payload.level = category.level;
  if (category.route_ui_style !== undefined) payload.route_ui_style = category.route_ui_style;
  if (category.sort_order !== undefined) payload.sort_order = category.sort_order;
  if (category.type !== undefined) payload.type = category.type;

  const result = await client.execute({
    query: mutation,
    variables: {
      categoryId,
      category: payload,
    },
  });

  return result?.update_categories_by_pk;
}

/**
 * 获取分类详情
 */
export async function getCategoryDetail(categoryId: number) {
  const query = `
    query GetCategoryDetail($categoryId: bigint!) {
      categories_by_pk(id: $categoryId) {
        id
        name
        icon_url
        parent_categories
        level
        route_ui_style
        sort_order
        type
      }
    }
  `;

  const result = await client.execute({
    query,
    variables: { categoryId },
  });

  return result?.categories_by_pk;
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

/**
 * 按父级 ID 获取子分类列表（仅当前公司，用于分类选择器按需加载第三层等）
 */
export async function getCategoryChildren(parentId: number, companyId: number) {
  const query = `
    query GetCategoryChildren($parentId: bigint!, $companyId: bigint!) {
      categories(
        where: {
          parent_categories: { _eq: $parentId }
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
        type
      }
    }
  `;
  const result = await client.execute({
    query,
    variables: { parentId, companyId },
  });
  return result?.categories || [];
}
