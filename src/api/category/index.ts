import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import { getDefaultCompanyId } from "@/api/config/index";

/**
 * 获取分类树（包含子分类）
 * 基于新的 GraphQL schema
 * 合并当前公司和默认公司的分类数据
 * @param companyId 公司ID
 * @param type 分类类型：'product' | 'package' | null（null表示所有类型）
 */
export async function getCategoryTree(companyId?: number | null, type?: 'product' | 'package' | null) {
  try {
    // 明确处理type参数，避免未定义错误
    const categoryType: 'product' | 'package' | null | undefined = type;
    
    // 获取默认公司ID
    const defaultCompanyId = await getDefaultCompanyId();
    
    // 确定要查询的公司ID列表（去重）
    const companyIds: number[] = [];
    if (companyId) {
      companyIds.push(companyId);
    }
    if (defaultCompanyId && defaultCompanyId !== companyId) {
      companyIds.push(defaultCompanyId);
    }
    
    // 构建查询条件
    const whereConditions: string[] = [
      '{ parent_categories: { _is_null: true } }',
      '{ is_deleted: { _eq: false } }', // 排除已删除的分类
    ];

    // 如果指定了type，添加type过滤条件
    if (categoryType) {
      whereConditions.push(`{ type: { _eq: $type } }`);
    }

    // 如果有公司ID，添加公司过滤条件
    if (companyIds.length > 0) {
      if (companyIds.length === 1) {
        // 只有一个公司ID，直接等于
        whereConditions.push(`{ company_companies: { _eq: $companyId } }`);
      } else {
        // 多个公司ID，使用 _or
        whereConditions.push(`{ company_companies: { _in: $companyIds } }`);
      }
    }

    // 获取父分类（level = 0 或 parent_categories 为 null）
    // 根据公司ID数量动态构建查询
    let parentQuery = '';
    let parentVariables: any = {};
    
    // 构建查询变量声明
    const variableDeclarations: string[] = [];
    if (companyIds.length === 1) {
      variableDeclarations.push('$companyId: bigint!');
    } else if (companyIds.length > 1) {
      variableDeclarations.push('$companyIds: [bigint!]!');
    }
    if (categoryType) {
      variableDeclarations.push('$type: String!');
    }
    const variableDeclarationStr = variableDeclarations.length > 0 
      ? `(${variableDeclarations.join(', ')})` 
      : '';

    if (companyIds.length === 1) {
      parentQuery = `
        query GetParentCategories${variableDeclarationStr} {
          categories(
            where: {
              _and: [
                ${whereConditions.join(',\n                ')}
              ]
            }
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
      parentVariables = { companyId: companyIds[0] };
      if (categoryType) {
        parentVariables.type = categoryType;
      }
    } else if (companyIds.length > 1) {
      parentQuery = `
        query GetParentCategories${variableDeclarationStr} {
          categories(
            where: {
              _and: [
                ${whereConditions.join(',\n                ')}
              ]
            }
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
      parentVariables = { companyIds };
      if (categoryType) {
        parentVariables.type = categoryType;
      }
    } else {
      parentQuery = `
        query GetParentCategories${variableDeclarationStr} {
          categories(
            where: {
              _and: [
                ${whereConditions.join(',\n                ')}
              ]
            }
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
      if (categoryType) {
        parentVariables.type = categoryType;
      }
    }

    const parentResult = await client.execute<{ categories: any[] }>({
      query: parentQuery,
      variables: parentVariables,
    });

    if (!parentResult.categories || parentResult.categories.length === 0) {
      return {
        code: 0,
        data: [],
        message: "获取分类成功",
      };
    }

    // 获取所有子分类
    const parentIds = parentResult.categories.map((cat) => cat.id);
    
    let childrenResult = { categories: [] };
    if (parentIds.length > 0) {
      const childrenWhereConditions = [
        '{ parent_categories: { _in: $parentIds } }',
        '{ is_deleted: { _eq: false } }',
      ];

      // 如果指定了type，添加type过滤条件
      if (categoryType) {
        childrenWhereConditions.push(`{ type: { _eq: $type } }`);
      }

      // 如果有公司ID，添加公司过滤条件
      if (companyIds.length > 0) {
        if (companyIds.length === 1) {
          childrenWhereConditions.push(`{ company_companies: { _eq: $companyId } }`);
        } else {
          childrenWhereConditions.push(`{ company_companies: { _in: $companyIds } }`);
        }
      }

      // 根据公司ID数量和type动态构建查询
      let childrenQuery = '';
      let childrenVariables: any = { parentIds };
      
      // 构建子查询变量声明
      const childrenVariableDeclarations: string[] = ['$parentIds: [bigint!]!'];
      if (companyIds.length === 1) {
        childrenVariableDeclarations.push('$companyId: bigint!');
      } else if (companyIds.length > 1) {
        childrenVariableDeclarations.push('$companyIds: [bigint!]!');
      }
      if (categoryType) {
        childrenVariableDeclarations.push('$type: String!');
      }
      const childrenVariableDeclarationStr = `(${childrenVariableDeclarations.join(', ')})`;
      
      if (companyIds.length === 1) {
        childrenQuery = `
          query GetChildrenCategories${childrenVariableDeclarationStr} {
            categories(
              where: {
                _and: [
                  ${childrenWhereConditions.join(',\n                  ')}
                ]
              }
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
        childrenVariables.companyId = companyIds[0];
        if (categoryType) {
          childrenVariables.type = categoryType;
        }
      } else if (companyIds.length > 1) {
        childrenQuery = `
          query GetChildrenCategories${childrenVariableDeclarationStr} {
            categories(
              where: {
                _and: [
                  ${childrenWhereConditions.join(',\n                  ')}
                ]
              }
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
        childrenVariables.companyIds = companyIds;
        if (categoryType) {
          childrenVariables.type = categoryType;
        }
      } else {
        childrenQuery = `
          query GetChildrenCategories${childrenVariableDeclarationStr} {
            categories(
              where: {
                _and: [
                  ${childrenWhereConditions.join(',\n                  ')}
                ]
              }
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
        if (categoryType) {
          childrenVariables.type = categoryType;
        }
      }

      childrenResult = await client.execute<{ categories: any[] }>({
        query: childrenQuery,
        variables: childrenVariables,
      });
    }

    // 组合数据，保持新 schema 的字段结构，只做必要的 UI 适配
    const categoryList = parentResult.categories.map((parent) => ({
      id: parent.id,
      name: parent.name,
      sort_order: parent.sort_order,
      route_ui_style: parent.route_ui_style,
      ui_style: parent.route_ui_style, // 兼容旧字段名
      icon_url: parent.icon_url,
      type: parent.type, // 分类类型
      // UI 需要的字段（兼容前端使用）
      skip: parent.route_ui_style === "products", // 如果 route_ui_style 是 products，则直接跳转到商品列表
      img: parent.icon_url ? { url: parent.icon_url } : null,
      icon: parent.icon_url,
      image: parent.icon_url,
      children: (childrenResult.categories || []).filter(
        (child) => child.parent_categories === parent.id
      ).map((child) => ({
        id: child.id,
        name: child.name,
        sort_order: child.sort_order,
        route_ui_style: child.route_ui_style,
        ui_style: child.route_ui_style, // 兼容旧字段名
        icon_url: child.icon_url,
        parent_categories: child.parent_categories,
        type: child.type, // 分类类型
        // UI 需要的字段
        skip: child.route_ui_style === "products",
        img: child.icon_url ? { url: child.icon_url } : null,
        icon: child.icon_url,
        image: child.icon_url,
      })),
    }));

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
