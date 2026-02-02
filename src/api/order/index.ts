import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';

/**
 * 获取当前用户的订单列表（用户端「我的订单」）
 */
export async function getMyOrderList(params: {
  userId: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const variables: any = {
    userId: params.userId,
    limit: params.limit || 20,
    offset: params.offset || 0,
  };

  let whereClause = `user_users: { _eq: $userId }`;

  if (params.status) {
    whereClause += `\n          status: { _eq: $status }`;
    variables.status = params.status;
  }

  const query = `
    query GetMyOrderList(
      $userId: bigint!
      ${params.status ? ', $status: String' : ''}
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
        company_companies
        company {
          id
          name
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
 * 获取当前用户的订单详情（用户端）
 */
export async function getMyOrderDetail(orderId: number, userId: number) {
  const query = `
    query GetMyOrderDetail($orderId: bigint!, $userId: bigint!) {
      orders_by_pk(id: $orderId) {
        id
        status
        total_price
        total_amount
        price_factor
        remark
        created_at
        updated_at
        user_users
        company_companies
        company {
          id
          name
        }
      }
    }
  `;

  const result = await client.execute({
    query,
    variables: { orderId, userId },
  });

  const order = result?.orders_by_pk;
  if (!order || Number(order.user_users) !== Number(userId)) {
    return null;
  }
  return order;
}
