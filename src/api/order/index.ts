import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';

/**
 * 获取当前用户的订单列表（用户端「我的订单」）
 * 支持按订单状态、支付状态筛选，以及按订单号/收货人/手机号搜索
 */
export async function getMyOrderList(params: {
  userId: number;
  orderStatus?: string;
  paymentStatus?: string;
  /** 搜索：订单号、收货人、收货手机号 */
  keyword?: string;
  limit?: number;
  offset?: number;
}) {
  const variables: any = {
    userId: params.userId,
    limit: params.limit || 20,
    offset: params.offset || 0,
  };

  const conditions: string[] = ['user_users: { _eq: $userId }'];
  if (params.orderStatus) {
    conditions.push('order_status: { _eq: $orderStatus }');
    variables.orderStatus = params.orderStatus;
  }
  if (params.paymentStatus) {
    conditions.push('payment_status: { _eq: $paymentStatus }');
    variables.paymentStatus = params.paymentStatus;
  }

  const hasKeyword = params.keyword != null && String(params.keyword).trim() !== '';
  const trimmedKeyword = hasKeyword ? String(params.keyword).trim() : '';
  const searchPattern = hasKeyword ? `%${trimmedKeyword}%` : '';
  const searchId = hasKeyword && /^\d+$/.test(trimmedKeyword) ? Number(trimmedKeyword) : null;

  let whereClause: string;
  const varDecls: string[] = [
    '$userId: bigint!',
    params.orderStatus ? '$orderStatus: String' : '',
    params.paymentStatus ? '$paymentStatus: String' : '',
    '$limit: Int',
    '$offset: Int',
  ].filter(Boolean);
  if (hasKeyword) {
    variables.searchPattern = searchPattern;
    if (searchId != null) variables.searchId = searchId;
    varDecls.push('$searchPattern: String');
    if (searchId != null) varDecls.push('$searchId: bigint');
    const baseWhere = conditions.join('\n          ');
    const orParts = [
      searchId != null ? '{ id: { _eq: $searchId } }' : '',
      '{ receiver_name: { _ilike: $searchPattern } }',
      '{ receiver_phone: { _ilike: $searchPattern } }',
    ].filter(Boolean);
    whereClause = `_and: [\n          { ${baseWhere} },\n          { _or: [ ${orParts.join(', ')} ] }\n        ]`;
  } else {
    whereClause = conditions.join('\n          ');
  }

  const query = `
    query GetMyOrderList(
      ${varDecls.join('\n      ')}
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
        order_status
        payment_status
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

/**
 * 根据订单 ID 获取订单详情（用于订单详情页，支持分享打开）
 * 返回订单及公司微信二维码，不校验当前用户
 */
export async function getOrderDetailById(orderId: number) {
  const query = `
    query GetOrderDetailById($orderId: bigint!) {
      orders_by_pk(id: $orderId) {
        id
        order_status
        payment_status
        total_price
        total_amount
        price_factor
        remark
        receiver_name
        receiver_phone
        receiver_address
        created_at
        company_companies
        user {
          id
          mobile
          nickname
        }
        company {
          id
          name
          wechat_code
        }
        order_items {
          id
          product_name
          product_image_url
          product_price
          quantity
          remark
        }
      }
    }
  `;
  const result = await client.execute({
    query,
    variables: { orderId },
  });
  return result?.orders_by_pk ?? null;
}

/** 订单项输入（从购物车生成） */
export interface CreateOrderItemInput {
  product_sku_product_skus: number;
  product_name: string;
  product_image_url?: string | null;
  product_price: number;
  quantity: number;
  /** 该子订单/规格的备注 */
  remark?: string | null;
}

/** 创建订单（从购物车选中项提交） */
export async function createOrder(params: {
  userId: number;
  companyId: number;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_province?: string | null;
  receiver_city?: string | null;
  receiver_district?: string | null;
  price_factor: number;
  total_price: number;
  total_amount: number;
  remark?: string | null;
  items: CreateOrderItemInput[];
}) {
  const mutation = `
    mutation CreateOrder($object: orders_insert_input!) {
      insert_orders_one(object: $object) {
        id
        order_status
        total_amount
        created_at
      }
    }
  `;
  const orderItemsData = params.items.map((item) => ({
    product_sku_product_skus: item.product_sku_product_skus,
    product_name: item.product_name,
    product_image_url: item.product_image_url || null,
    product_price: item.product_price,
    quantity: item.quantity,
    remark: item.remark ?? null,
  }));

  const object = {
    user_users: params.userId,
    company_companies: params.companyId,
    receiver_name: params.receiver_name,
    receiver_phone: params.receiver_phone,
    receiver_address: params.receiver_address,
    receiver_province: params.receiver_province ?? null,
    receiver_city: params.receiver_city ?? null,
    receiver_district: params.receiver_district ?? null,
    price_factor: params.price_factor,
    total_price: params.total_price,
    total_amount: params.total_amount,
    actual_amount: 0,
    order_status: 'pending',
    payment_status: 'pending',
    remark: params.remark || null,
    order_items: {
      data: orderItemsData,
    },
  };

  const result = await client.execute({
    query: mutation,
    variables: { object },
  });
  return result?.insert_orders_one;
}
