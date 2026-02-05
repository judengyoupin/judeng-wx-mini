/**
 * 管理端分类 API（公司端分类管理、CategoryPicker 等）
 * 放在主包以便主包组件 CategoryPicker 可引用；分包页面也可从主包 require
 */
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
 * 获取分类树（一次请求返回三层：根 → 二级 → 三级）
 */
export async function getCategoryTree(companyId: number, type?: 'product' | 'package') {
  const typeCondition = type ? ', type: { _eq: $type }' : '';
  const aggFields = `
        products_aggregate(where: { is_deleted: { _eq: false } }) { aggregate { count } }
        packages_aggregate { aggregate { count } }
  `;
  const query = `
    query GetCategoryTree($companyId: bigint!${type ? ', $type: String!' : ''}) {
      categories(
        where: {
          company_companies: { _eq: $companyId }
          is_deleted: { _eq: false }
          parent_categories: { _is_null: true }
          ${type ? 'type: { _eq: $type }' : ''}
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
        ${aggFields}
        categories(
          where: { is_deleted: { _eq: false }${typeCondition} }
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
          ${aggFields}
          categories(
            where: { is_deleted: { _eq: false }${typeCondition} }
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
            ${aggFields}
          }
        }
      }
    }
  `;

  const variables: { companyId: number; type?: string } = { companyId };
  if (type) variables.type = type;

  const result = await client.execute({
    query,
    variables,
  });

  return result?.categories || [];
}

/** 递归给节点打上 _companyId（用于多公司合并树） */
function tagTreeWithCompanyId(nodes: any[]): any[] {
  return nodes.map((node: any) => ({
    ...node,
    _companyId: node.company_companies,
    categories: node.categories ? tagTreeWithCompanyId(node.categories) : [],
  }));
}

/**
 * 一次请求获取多公司分类树 + 指定公司的 hidden_category_ids（用于「全部」范围）
 */
export async function getCategoryTreeMultiCompany(params: {
  companyIds: number[];
  hiddenForCompanyId: number;
  type?: 'product' | 'package';
}) {
  const typeCondition = params.type ? ', type: { _eq: $type }' : '';
  const aggFields = `
        products_aggregate(where: { is_deleted: { _eq: false } }) { aggregate { count } }
        packages_aggregate { aggregate { count } }
  `;
  const query = `
    query GetCategoryTreeMulti($companyIds: [bigint!]!, $hiddenForCompanyId: bigint!${params.type ? ', $type: String!' : ''}) {
      company: companies_by_pk(id: $hiddenForCompanyId) { hidden_category_ids }
      categories(
        where: {
          company_companies: { _in: $companyIds }
          is_deleted: { _eq: false }
          parent_categories: { _is_null: true }
          ${params.type ? ', type: { _eq: $type }' : ''}
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
        company_companies
        ${aggFields}
        categories(
          where: { is_deleted: { _eq: false }${typeCondition} }
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
          company_companies
          ${aggFields}
          categories(
            where: { is_deleted: { _eq: false }${typeCondition} }
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
            company_companies
            ${aggFields}
          }
        }
      }
    }
  `;
  const variables: Record<string, unknown> = {
    companyIds: params.companyIds,
    hiddenForCompanyId: params.hiddenForCompanyId,
  };
  if (params.type) variables.type = params.type;

  const result = await client.execute<{
    company: { hidden_category_ids: (string | number)[] | null } | null;
    categories: any[];
  }>({
    query,
    variables,
  });

  const hidden = result?.company?.hidden_category_ids;
  const hiddenCategoryIds = Array.isArray(hidden) ? hidden.map((id) => Number(id)) : [];
  const categories = tagTreeWithCompanyId(result?.categories ?? []);

  return {
    categories,
    hiddenCategoryIds,
  };
}

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

export async function getCategoryChildren(parentId: number, companyId: number, type?: 'product' | 'package') {
  const query = `
    query GetCategoryChildren($parentId: bigint!, $companyId: bigint!${type ? ', $type: String!' : ''}) {
      categories(
        where: {
          parent_categories: { _eq: $parentId }
          company_companies: { _eq: $companyId }
          is_deleted: { _eq: false }
          ${type ? 'type: { _eq: $type }' : ''}
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
  const variables: { parentId: number; companyId: number; type?: string } = { parentId, companyId };
  if (type) variables.type = type;
  const result = await client.execute({
    query,
    variables,
  });
  return result?.categories || [];
}
