/**
 * Translations for Orders Management
 * Support for English and Chinese
 */

export type Locale = 'en' | 'zh';

export const ordersTranslations = {
  en: {
    // Page Title
    title: 'Orders Management',
    subtitle: 'Manage and track all customer orders',

    // Stats
    stats: {
      total: 'Total Orders',
      depositPaid: 'Deposit Paid',
      vehiclePurchased: 'Vehicle Purchased',
      inTransit: 'In Transit',
      shipping: 'Shipping',
      delivered: 'Delivered',
      totalDeposits: 'Total Deposits',
    },

    // Search & Filters
    search: {
      placeholder: 'Search by order number, customer, or vehicle...',
      noResults: 'No orders found',
      loading: 'Loading orders...',
    },

    // Actions
    actions: {
      refresh: 'Refresh',
      view: 'View Details',
      updateStatus: 'Update Status',
      uploadDocument: 'Upload Document',
      sendWhatsApp: 'Send WhatsApp',
      viewTracking: 'View Tracking',
    },

    // Status Labels
    status: {
      deposit_paid: 'Deposit Paid',
      vehicle_locked: 'Vehicle Locked',
      inspection_sent: 'Inspection Sent',
      full_payment_received: 'Full Payment Received',
      vehicle_purchased: 'Vehicle Purchased',
      export_customs: 'Export Customs',
      in_transit: 'In Transit',
      at_port: 'At Port',
      shipping: 'Shipping',
      documents_ready: 'Documents Ready',
      customs: 'Customs Clearance',
      ready_pickup: 'Ready for Pickup',
      delivered: 'Delivered',
    },

    // Status Descriptions
    statusDescriptions: {
      deposit_paid: 'Customer deposit has been received',
      vehicle_locked: 'Vehicle reserved and locked for this order',
      inspection_sent: 'Inspection report sent to customer',
      full_payment_received: 'Full payment received from customer',
      vehicle_purchased: 'Vehicle successfully purchased',
      export_customs: 'Processing export customs',
      in_transit: 'Vehicle in transit to port',
      at_port: 'Vehicle arrived at origin port',
      shipping: 'Vehicle is shipping overseas',
      documents_ready: 'All shipping documents ready',
      customs: 'Clearing import customs',
      ready_pickup: 'Ready for customer pickup',
      delivered: 'Order completed and delivered',
    },

    // Order Details
    order: {
      number: 'Order #',
      quote: 'Quote #',
      customer: 'Customer',
      vehicle: 'Vehicle',
      source: 'Source',
      destination: 'Destination',
      shipping: 'Shipping',
      cost: 'Total Cost',
      deposit: 'Deposit',
      status: 'Status',
      created: 'Created',
      updated: 'Updated',
      eta: 'Est. Arrival',
    },

    // Documents
    documents: {
      title: 'Documents',
      uploaded: 'Uploaded',
      missing: 'Missing',
      required: 'Required',
      optional: 'Optional',
      uploadNew: 'Upload New',
      viewAll: 'View All',
    },

    // Tracking
    tracking: {
      title: 'Tracking History',
      step: 'Step',
      timestamp: 'Date & Time',
      note: 'Note',
      updatedBy: 'Updated by',
      noHistory: 'No tracking history yet',
    },

    // Notifications
    notifications: {
      statusUpdated: 'Status updated successfully',
      documentUploaded: 'Document uploaded successfully',
      whatsappSent: 'WhatsApp notification sent',
      error: 'An error occurred',
      adminNotified: 'Admin has been notified',
      collaboratorNotified: 'Collaborator has been notified',
    },

    // Common
    common: {
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      confirm: 'Confirm',
      yes: 'Yes',
      no: 'No',
    },

    // Pagination
    pagination: {
      page: 'Page',
      of: 'of',
      showing: 'Showing',
      to: 'to',
      results: 'results',
      previous: 'Previous',
      next: 'Next',
    },
  },

  zh: {
    // 页面标题
    title: '订单管理',
    subtitle: '管理和跟踪所有客户订单',

    // 统计
    stats: {
      total: '总订单数',
      depositPaid: '已付定金',
      vehiclePurchased: '已购车辆',
      inTransit: '运输中',
      shipping: '海运中',
      delivered: '已交付',
      totalDeposits: '定金总额',
    },

    // 搜索和筛选
    search: {
      placeholder: '搜索订单号、客户或车辆...',
      noResults: '未找到订单',
      loading: '加载订单中...',
    },

    // 操作
    actions: {
      refresh: '刷新',
      view: '查看详情',
      updateStatus: '更新状态',
      uploadDocument: '上传文件',
      sendWhatsApp: '发送WhatsApp',
      viewTracking: '查看跟踪',
    },

    // 状态标签
    status: {
      deposit_paid: '已付定金',
      vehicle_locked: '车辆已锁定',
      inspection_sent: '已发送检验报告',
      full_payment_received: '已收全款',
      vehicle_purchased: '车辆已购买',
      export_customs: '出口清关',
      in_transit: '运输中',
      at_port: '已到港口',
      shipping: '海运中',
      documents_ready: '文件准备就绪',
      customs: '进口清关',
      ready_pickup: '准备提车',
      delivered: '已交付',
    },

    // 状态描述
    statusDescriptions: {
      deposit_paid: '已收到客户定金',
      vehicle_locked: '车辆已为此订单预留',
      inspection_sent: '检验报告已发送给客户',
      full_payment_received: '已收到客户全额付款',
      vehicle_purchased: '车辆购买成功',
      export_customs: '正在处理出口清关',
      in_transit: '车辆正在运往港口',
      at_port: '车辆已到达始发港',
      shipping: '车辆正在海运中',
      documents_ready: '所有运输文件已准备就绪',
      customs: '正在进行进口清关',
      ready_pickup: '准备客户提车',
      delivered: '订单已完成并交付',
    },

    // 订单详情
    order: {
      number: '订单号',
      quote: '报价号',
      customer: '客户',
      vehicle: '车辆',
      source: '来源',
      destination: '目的地',
      shipping: '运输',
      cost: '总费用',
      deposit: '定金',
      status: '状态',
      created: '创建时间',
      updated: '更新时间',
      eta: '预计到达',
    },

    // 文件
    documents: {
      title: '文件',
      uploaded: '已上传',
      missing: '缺失',
      required: '必需',
      optional: '可选',
      uploadNew: '上传新文件',
      viewAll: '查看全部',
    },

    // 跟踪
    tracking: {
      title: '跟踪历史',
      step: '步骤',
      timestamp: '日期时间',
      note: '备注',
      updatedBy: '更新人',
      noHistory: '暂无跟踪历史',
    },

    // 通知
    notifications: {
      statusUpdated: '状态更新成功',
      documentUploaded: '文件上传成功',
      whatsappSent: 'WhatsApp通知已发送',
      error: '发生错误',
      adminNotified: '已通知管理员',
      collaboratorNotified: '已通知协作员',
    },

    // 通用
    common: {
      cancel: '取消',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      close: '关闭',
      loading: '加载中...',
      error: '错误',
      success: '成功',
      confirm: '确认',
      yes: '是',
      no: '否',
    },

    // 分页
    pagination: {
      page: '第',
      of: '页，共',
      showing: '显示',
      to: '至',
      results: '条结果',
      previous: '上一页',
      next: '下一页',
    },
  },
} as const;

// Helper function to get translation
export function getOrdersTranslation(locale: Locale) {
  return ordersTranslations[locale] || ordersTranslations.en;
}

// Type-safe translation keys
export type OrdersTranslationKeys = typeof ordersTranslations.en;
