import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';

/**
 * 获取订单列表（公司管理员用）
 */
export async function getOrderList(params: {
  companyId: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const variables: any = {
    companyId: params.companyId,
    limit: params.limit || 20,
    offset: params.offset || 0,
  };

  let whereClause = `company_companies: { _eq: $companyId }`;

  if (params.status) {
    whereClause += `\n          status: { _eq: $status }`;
    variables.status = params.status;
  }

  // TODO: 后端 Schema 中 orders 表暂时没有关联 order_items，需要后端修复。
  // 暂时移除 order_items 查询，防止报错。
  const query = `
    query GetOrderList(
      $companyId: bigint!
      ${params.status ? '$status: String' : ''}
      $limit: Int
      $offset: Int
    ) {
      orders(
        where: {
          ${whereClause}
        }
        limit: $limit
        offset: $offset
        order_by: { created_at: desc }
      ) {
        id
        status
        total_price
        total_amount
        price_factor
        remark
        created_at
        updated_at
        user {
          id
          mobile
          nickname
          avatar_url
        }
      }
      orders_aggregate(
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

  const result = await client.execute({
    query,
    variables,
  });

  return {
    orders: result?.orders || [],
    total: result?.orders_aggregate?.aggregate?.count || 0,
  };
}

/**
 * 获取订单详情
 */
export async function getOrderDetail(orderId: number) {
  // TODO: 同样暂时移除了 order_items
  const query = `
    query GetOrderDetail($orderId: bigint!) {
      orders_by_pk(id: $orderId) {
        id
        status
        total_price
        total_amount
        price_factor
        remark
        created_at
        updated_at
        user {
          id
          mobile
          nickname
          avatar_url
        }
        company {
          id
          name
        }
      }
    }
  `;

  const result = await client.execute({
    query,
    variables: { orderId },
  });

  return result?.orders_by_pk;
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(orderId: number, status: 'pending' | 'submitted') {
  const mutation = `
    mutation UpdateOrderStatus($orderId: bigint!, $status: String!) {
      update_orders_by_pk(
        pk_columns: { id: $orderId }
        _set: { status: $status }
      ) {
        id
        status
        updated_at
      }
    }
  `;

  const result = await client.execute({
    query: mutation,
    variables: {
      orderId,
      status,
    },
  });

  return result?.update_orders_by_pk;
}
