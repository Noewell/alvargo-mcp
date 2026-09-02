export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, { type: 'string' | 'number' | 'boolean'; description?: string; enum?: readonly string[] }>; required: string[] };
  public: boolean;
};

export const TOOLS: readonly ToolDefinition[] = [
  { name: 'quote_freight', description: 'Get an Alvargo freight quote for a lane.', inputSchema: { type: 'object', properties: { origin: { type: 'string' }, destination: { type: 'string' }, cargo_type: { type: 'string' }, weight_lbs: { type: 'number' }, equipment_type: { type: 'string' }, pickup_date: { type: 'string' }, order_value: { type: 'number' } }, required: ['origin', 'destination', 'cargo_type', 'weight_lbs'] }, public: true },
  { name: 'create_shipment', description: 'Create a live Alvargo shipment. Requires a scoped MCP key.', inputSchema: { type: 'object', properties: { origin: { type: 'string' }, destination: { type: 'string' }, cargo_type: { type: 'string' }, weight_lbs: { type: 'number' }, equipment_type: { type: 'string' }, offered_rate: { type: 'number' }, pickup_date: { type: 'string' }, notes: { type: 'string' } }, required: ['origin', 'destination', 'cargo_type', 'weight_lbs'] }, public: false },
  { name: 'get_shipment', description: 'Retrieve a shipper-scoped shipment. Requires a scoped MCP key.', inputSchema: { type: 'object', properties: { shipment_id: { type: 'string' } }, required: ['shipment_id'] }, public: false },
  { name: 'update_status', description: 'Update a shipper-scoped shipment status. Requires a scoped MCP key.', inputSchema: { type: 'object', properties: { shipment_id: { type: 'string' }, new_status: { type: 'string' }, notes: { type: 'string' } }, required: ['shipment_id', 'new_status'] }, public: false },
  { name: 'find_drivers', description: 'Find available drivers. Requires a scoped MCP key.', inputSchema: { type: 'object', properties: { location: { type: 'string' }, radius_miles: { type: 'number' }, vehicle_type: { type: 'string' } }, required: ['location'] }, public: false },
  { name: 'assign_driver', description: 'Assign a driver to a shipper-scoped shipment. Requires a scoped MCP key.', inputSchema: { type: 'object', properties: { shipment_id: { type: 'string' }, driver_id: { type: 'string' } }, required: ['shipment_id', 'driver_id'] }, public: false },
  { name: 'upload_document', description: 'Upload a shipper-scoped freight document. Requires a scoped MCP key.', inputSchema: { type: 'object', properties: { user_id: { type: 'string' }, document_type: { type: 'string' }, file_name: { type: 'string' }, file_base64: { type: 'string' }, mime_type: { type: 'string' }, role: { type: 'string' } }, required: ['user_id', 'document_type', 'file_name', 'file_base64', 'mime_type', 'role'] }, public: false },
  { name: 'get_market_rates', description: 'Get Alvargo freight market-rate benchmarks.', inputSchema: { type: 'object', properties: { origin_state: { type: 'string' }, destination_state: { type: 'string' }, equipment_type: { type: 'string' } }, required: [] }, public: true },
  { name: 'analyze_freight_image', description: 'Analyze freight for photo-to-quote assistance. Requires a scoped MCP key.', inputSchema: { type: 'object', properties: { image_url: { type: 'string' }, image_base64: { type: 'string' }, mime_type: { type: 'string' } }, required: [] }, public: false },
  { name: 'register_shipper', description: 'Register a prospective Alvargo shipper account.', inputSchema: { type: 'object', properties: { company_name: { type: 'string' }, email: { type: 'string' }, contact_name: { type: 'string' }, phone: { type: 'string' } }, required: ['company_name', 'email'] }, public: true },
] as const;

export const PUBLIC_TOOL_NAMES = new Set(TOOLS.filter((tool) => tool.public).map((tool) => tool.name));

const argumentMap: Record<string, Record<string, string>> = {
  quote_freight: { cargo_type: 'cargoType', weight_lbs: 'weightLbs', equipment_type: 'equipmentNeeded', pickup_date: 'pickupDate', order_value: 'orderValue' },
  create_shipment: { cargo_type: 'cargoType', weight_lbs: 'weightLbs', equipment_type: 'equipmentNeeded', offered_rate: 'offeredRate', pickup_date: 'pickupDate' },
  get_shipment: { shipment_id: 'shipmentId' }, update_status: { shipment_id: 'shipmentId', new_status: 'newStatus' },
  find_drivers: { location: 'currentLocation', radius_miles: 'radiusMiles', vehicle_type: 'vehicleType' }, assign_driver: { shipment_id: 'shipmentId', driver_id: 'driverId' },
  upload_document: { user_id: 'userId', document_type: 'documentType', file_name: 'fileName', file_base64: 'fileBase64', mime_type: 'mimeType' },
  register_shipper: { company_name: 'companyName', contact_name: 'contactName' },
};

const toolMap: Record<string, string> = {
  quote_freight: 'calculate_price', create_shipment: 'create_shipment', get_shipment: 'get_shipment_details', update_status: 'update_shipment_status',
  find_drivers: 'get_available_drivers', assign_driver: 'assign_driver_to_shipment', upload_document: 'upload_document', get_market_rates: 'get_market_rates',
  analyze_freight_image: 'analyze_freight_image', register_shipper: 'register_shipper',
};

export function toPlatformTool(toolName: string) { return toolMap[toolName] || toolName; }
export function toPlatformArguments(toolName: string, args: Record<string, unknown>) {
  const mapping = argumentMap[toolName] || {};
  return Object.fromEntries(Object.entries(args).map(([key, value]) => [mapping[key] || key, value]));
}
