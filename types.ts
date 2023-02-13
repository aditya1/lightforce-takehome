export interface DBEntry {
	pk: string
	sk: string
	deviceType: string
	deviceClass: string
	status: string
	name: string
	factoryName: string
	deviceAttributes?: Object
	createdAt: number
	deletedAt?: number
}

export interface WSBody {
	factoryName: string
	deviceType: string
	deviceClass: string
	status: string
	ipAddress: string
	name: string
	deviceAttributes?: Object
}

export interface WSResp extends WSBody {
	id: string
}
