export type McpToolProperty = {
  type: 'string' | 'number' | 'boolean';
  description?: string;
  enum?: readonly string[];
};

export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, McpToolProperty>;
    required: string[];
  };
  public: boolean;
};

/**
 * Canonical public MCP contract. The names here are intentionally stable and
 * translate to Alvargo-LaaSv1 internal tool names only at the gateway boundary.
 */
export const MCP_TOOLS: readonly McpToolDefinition[] = [
  {
    name: 'quote_freight',
    description: 'Get an Alvargo freight quote for a lane. This tool does not require an MCP key.',
    inputSchema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: 'Pickup address or city and state.' },
        destination: { type: 'string', description: 'Delivery address or city and state.' },
        cargo_type: { type: 'string', description: 'Cargo or commodity type.' },
        weight_lbs: { type: 'number', description: 'Total shipment weight in pounds.' },
        equipment_type: { type: 'string', enum: ['DRY_VAN', 'REEFER', 'FLATBED', 'BOX_TRUCK', 'CARGO_VAN', 'STEP_DECK'], description: 'Requested equipment type.' },
        pickup_date: { type: 'string', description: 'Requested pickup date in YYYY-MM-DD format.' },
        order_value: { type: 'number', description: 'Declared cargo value in USD, if known.' },
      },
      required: ['origin', 'destination', 'cargo_type', 'weight_lbs'],
    },
    public: true,
  },
  {
    name: 'create_shipment',
    description: 'Create a live freight shipment on the Alvargo network. Requires an MCP key with create_shipment permission.',
    inputSchema: {
      type: 'object',
      properties: {
        origin: { type: 'string' }, destination: { type: 'string' }, cargo_type: { type: 'string' }, weight_lbs: { type: 'number' },
        equipment_type: { type: 'string' }, offered_rate: { type: 'number' }, pickup_date: { type: 'string' }, notes: { type: 'string' },
      },
      required: ['origin', 'destination', 'cargo_type', 'weight_lbs'],
    },
    public: false,
  },
  {
    name: 'get_shipment',
    description: 'Retrieve the status and details of a shipper-scoped Alvargo shipment. Requires an MCP key.',
    inputSchema: { type: 'object', properties: { shipment_id: { type: 'string', description: 'Alvargo shipment ID.' } }, required: ['shipment_id'] },
    public: false,
  },
  {
    name: 'update_status',
    description: 'Update the status of a shipper-scoped shipment. Requires an MCP key with update_shipment_status permission.',
    inputSchema: {
      type: 'object',
      properties: {
        shipment_id: { type: 'string' },
        new_status: { type: 'string', enum: ['pending', 'assigned', 'en_route_pickup', 'at_pickup', 'loaded', 'in_transit', 'at_delivery', 'delivered', 'pod_uploaded', 'completed'] },
        notes: { type: 'string' },
      },
      required: ['shipment_id', 'new_status'],
    },
    public: false,
  },
  {
    name: 'find_drivers',
    description: 'Find available drivers matching a location and optional vehicle type. Requires an MCP key.',
    inputSchema: {
      type: 'object',
      properties: { location: { type: 'string' }, radius_miles: { type: 'number' }, vehicle_type: { type: 'string' } },
      required: ['location'],
    },
    public: false,
  },
  {
    name: 'assign_driver',
    description: 'Assign a driver to a shipper-scoped shipment. Requires an MCP key with assign_driver_to_shipment permission.',
    inputSchema: {
      type: 'object', properties: { shipment_id: { type: 'string' }, driver_id: { type: 'string' } }, required: ['shipment_id', 'driver_id'],
    },
    public: false,
  },
  {
    name: 'upload_document',
    description: 'Upload a BOL, POD, invoice, or compliance document to the authenticated shipper scope. Requires an MCP key with upload_document permission.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' }, document_type: { type: 'string', enum: ['bol', 'pod', 'insurance', 'license', 'registration', 'invoice', 'other'] },
        file_name: { type: 'string' }, file_base64: { type: 'string' }, mime_type: { type: 'string' }, role: { type: 'string', enum: ['shipper', 'driver', 'dispatcher'] },
      },
      required: ['user_id', 'document_type', 'file_name', 'file_base64', 'mime_type', 'role'],
    },
    public: false,
  },
  {
    name: 'get_market_rates',
    description: 'Get Alvargo freight market-rate benchmarks. This tool does not require an MCP key.',
    inputSchema: {
      type: 'object', properties: { origin_state: { type: 'string' }, destination_state: { type: 'string' }, equipment_type: { type: 'string' } }, required: [],
    },
    public: true,
  },
  {
    name: 'analyze_freight_image',
    description: 'Analyze a freight image for photo-to-quote assistance. Requires an MCP key with create_shipment permission.',
    inputSchema: {
      type: 'object', properties: { image_url: { type: 'string' }, image_base64: { type: 'string' }, mime_type: { type: 'string' } }, required: [],
    },
    public: false,
  },
  {
    name: 'register_shipper',
    description: 'Register a prospective Alvargo shipper account. This tool does not require an MCP key.',
    inputSchema: {
      type: 'object', properties: { company_name: { type: 'string' }, email: { type: 'string' }, contact_name: { type: 'string' }, phone: { type: 'string' } }, required: ['company_name', 'email'],
    },
    public: true,
  },
] as const;

export const PUBLIC_TOOL_NAMES = new Set(MCP_TOOLS.filter((tool) => tool.public).map((tool) => tool.name));

export const MAIN_PLATFORM_TOOL_MAP: Record<string, string> = {
  quote_freight: 'calculate_price',
  create_shipment: 'create_shipment',
  get_shipment: 'get_shipment_details',
  update_status: 'update_shipment_status',
  find_drivers: 'get_available_drivers',
  assign_driver: 'assign_driver_to_shipment',
  upload_document: 'upload_document',
  get_market_rates: 'get_market_rates',
  analyze_freight_image: 'analyze_freight_image',
  register_shipper: 'register_shipper',
};

export const MAIN_PLATFORM_ARGUMENT_MAP: Record<string, Record<string, string>> = {
  quote_freight: { cargo_type: 'cargoType', weight_lbs: 'weightLbs', equipment_type: 'equipmentNeeded', pickup_date: 'pickupDate', order_value: 'orderValue' },
  create_shipment: { cargo_type: 'cargoType', weight_lbs: 'weightLbs', equipment_type: 'equipmentNeeded', offered_rate: 'offeredRate', pickup_date: 'pickupDate' },
  get_shipment: { shipment_id: 'shipmentId' },
  update_status: { shipment_id: 'shipmentId', new_status: 'newStatus' },
  find_drivers: { radius_miles: 'radiusMiles', vehicle_type: 'vehicleType', location: 'currentLocation' },
  assign_driver: { shipment_id: 'shipmentId', driver_id: 'driverId' },
  upload_document: { user_id: 'userId', document_type: 'documentType', file_name: 'fileName', file_base64: 'fileBase64', mime_type: 'mimeType' },
  register_shipper: { company_name: 'companyName', contact_name: 'contactName' },
};
