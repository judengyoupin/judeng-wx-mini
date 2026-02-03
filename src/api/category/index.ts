import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import { getDefaultCompanyId } from "@/api/config/index";

/**
 * 单节点转为前端树节点格式（含 children），并过滤隐藏分类
 */
function mapCategoryNode(c: any, hiddenCategoryIds: number[]): any | null {
  if (hiddenCategoryIds.length && hiddenCategoryIds.includes(Number(c.id))) return null;
  const rawChildren = Array.isArray(c.categories) ? c.categories : [];
  const children = rawChildren.map((child: any) => mapCategoryNode(child, hiddenCategoryIds)).filter(Boolean);
  return {
    id: c.id,
    name: c.name,
    sort_order: c.sort_order,
    route_ui_style: c.route_ui_style,
    ui_style: c.route_ui_style,
    icon_url: c.icon_url,
    parent_categories: c.parent_categories,
    type: c.type,
    skip: c.route_ui_style === "products",
    img: c.icon_url ? { url: c.icon_url } : null,
    icon: c.icon_url,
    image: c.icon_url,
    children,
  };
}

/**
 * 获取分类树（一次请求返回三层：根 → 二级 → 三级）
 * 合并当前公司和默认公司的分类数据，并过滤当前公司的隐藏分类
 * @param companyId 公司ID
 * @param type 分类类型：'product' | 'package' | null（null表示所有类型）
 */
export async function getCategoryTree(companyId?: number | null, type?: 'product' | 'package' | null) {
  try {
    const categoryType: 'product' | 'package' | null | undefined = type;
    const defaultCompanyId = await getDefaultCompanyId();

    const companyIds: number[] = [];
    if (companyId) companyIds.push(companyId);
    if (defaultCompanyId && defaultCompanyId !== companyId) companyIds.push(defaultCompanyId);
    if (companyIds.length === 0) {
      return { code: 0, data: [], message: "获取分类成功" };
    }

    let hiddenCategoryIds: number[] = [];
    const currentCompanyId = companyId ?? null;
    if (currentCompanyId) {
      try {
        const hideRes = await client.execute<{ companies_by_pk: { hidden_category_ids: (string | number)[] | null } | null }>({
          query: `query GetCompanyHiddenCategories($id: bigint!) {
            companies_by_pk(id: $id) { hidden_category_ids }
          }`,
          variables: { id: currentCompanyId },
        });
        const arr = hideRes?.companies_by_pk?.hidden_category_ids;
        hiddenCategoryIds = Array.isArray(arr) ? arr.map((id) => Number(id)) : [];
      } catch (_) {}
    }

    // 一次请求：根分类 + 二层、三层通过嵌套 relation 拉取
    const whereConditions = [
      '{ parent_categories: { _is_null: true } }',
      '{ is_deleted: { _eq: false } }',
    ];
    if (categoryType) whereConditions.push('{ type: { _eq: $type } }');
    if (companyIds.length === 1) whereConditions.push('{ company_companies: { _eq: $companyId } }');
    else whereConditions.push('{ company_companies: { _in: $companyIds } }');

    const variableDeclarations = companyIds.length === 1 ? ['$companyId: bigint!'] : ['$companyIds: [bigint!]!'];
    if (categoryType) variableDeclarations.push('$type: String!');
    const varStr = `(${variableDeclarations.join(', ')})`;
    const nestedWhere = categoryType ? '{ is_deleted: { _eq: false }, type: { _eq: $type } }' : '{ is_deleted: { _eq: false } }';

    const treeQuery = `
      query GetCategoryTreeFull${varStr} {
        categories(
          where: { _and: [ ${whereConditions.join(', ')} ] }
          order_by: { sort_order: asc }
        ) {
          id
          name
          sort_order
          route_ui_style
          icon_url
          parent_categories
          level
          type
          categories(
            where: ${nestedWhere}
            order_by: { sort_order: asc }
          ) {
            id
            name
            sort_order
            route_ui_style
            icon_url
            parent_categories
            level
            type
            categories(
              where: ${nestedWhere}
              order_by: { sort_order: asc }
            ) {
              id
              name
              sort_order
              route_ui_style
              icon_url
              parent_categories
              level
              type
            }
          }
        }
      }
    `;

    const variables: any = companyIds.length === 1 ? { companyId: companyIds[0] } : { companyIds };
    if (categoryType) variables.type = categoryType;

    const result = await client.execute<{ categories: any[] }>({
      query: treeQuery,
      variables,
    });

    const rawList = result?.categories || [];
    const categoryList = rawList.map((c) => mapCategoryNode(c, hiddenCategoryIds)).filter(Boolean);

    return {
      code: 0,
      data: categoryList,
      message: "获取分类成功",
    };
  } catch (error: any) {
    console.error("获取分类失败:", error);
    return {
      code: -1,
      data: [],
      message: "获取分类失败: " + (error.message || JSON.stringify(error)),
    };
  }
}

/**
 * 按父级分类 ID 获取子分类列表（用于分类筛选页：继续展示分类时加载子分类）
 */
export async function getCategoryChildren(parentId: number, companyId?: number | null) {
  try {
    const defaultCompanyId = await getDefaultCompanyId();
    const companyIds: number[] = [];
    if (companyId) companyIds.push(companyId);
    if (defaultCompanyId && defaultCompanyId !== companyId) companyIds.push(defaultCompanyId);

    // 当前用户所属公司的隐藏分类 id，子分类列表需过滤（仅当传入 companyId 时）
    let hiddenCategoryIds: number[] = [];
    const currentCompanyIdForHide = companyId ?? null;
    if (currentCompanyIdForHide) {
      try {
        const hideRes = await client.execute<{ companies_by_pk: { hidden_category_ids: (string | number)[] | null } | null }>({
          query: `query GetCompanyHiddenCategories($id: bigint!) {
            companies_by_pk(id: $id) { hidden_category_ids }
          }`,
          variables: { id: currentCompanyIdForHide },
        });
        const arr = hideRes?.companies_by_pk?.hidden_category_ids;
        hiddenCategoryIds = Array.isArray(arr) ? arr.map((id) => Number(id)) : [];
      } catch (_) {}
    }

    const whereConditions = [
      '{ parent_categories: { _eq: $parentId } }',
      '{ is_deleted: { _eq: false } }',
    ];
    if (companyIds.length === 1) {
      whereConditions.push('{ company_companies: { _eq: $companyId } }');
    } else if (companyIds.length > 1) {
      whereConditions.push('{ company_companies: { _in: $companyIds } }');
    }

    const variableDeclarations = ['$parentId: bigint!'];
    if (companyIds.length === 1) variableDeclarations.push('$companyId: bigint!');
    else if (companyIds.length > 1) variableDeclarations.push('$companyIds: [bigint!]!');
    const varStr = `(${variableDeclarations.join(', ')})`;

    const query = `
      query GetCategoryChildren${varStr} {
        categories(
          where: { _and: [ ${whereConditions.join(', ')} ] }
          order_by: { sort_order: asc }
        ) {
          id
          name
          sort_order
          route_ui_style
          icon_url
          parent_categories
          level
          type
        }
      }
    `;
    const variables: any = { parentId };
    if (companyIds.length === 1) variables.companyId = companyIds[0];
    else if (companyIds.length > 1) variables.companyIds = companyIds;

    const result = await client.execute<{ categories: any[] }>({
      query,
      variables,
    });

    const list = result?.categories || [];
    const filtered = list.filter(
      (c) => !hiddenCategoryIds.length || !hiddenCategoryIds.includes(Number(c.id))
    );
    const data = filtered.map((child) => ({
      id: child.id,
      name: child.name,
      sort_order: child.sort_order,
      route_ui_style: child.route_ui_style,
      ui_style: child.route_ui_style,
      icon_url: child.icon_url,
      parent_categories: child.parent_categories,
      type: child.type,
      skip: child.route_ui_style === "products",
      img: child.icon_url ? { url: child.icon_url } : null,
      icon: child.icon_url,
      image: child.icon_url,
    }));

    return { code: 0, data, message: "获取成功" };
  } catch (error: any) {
    console.error("获取子分类失败:", error);
    return {
      code: -1,
      data: [],
      message: "获取子分类失败: " + (error.message || JSON.stringify(error)),
    };
  }
}
