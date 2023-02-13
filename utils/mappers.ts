import { WSResp, DBEntry } from '../types'

const mapDynamoDBItemToResponse = (item: DBEntry): WSResp | undefined => {
	const {
		pk,
		sk,
		deviceType,
		status,
		deletedAt,
		name,
		deviceClass,
		deviceAttributes,
		factoryName,
	} = item
	const tokens = sk.split('::')
	if (tokens.length !== 2) return undefined
	if (deletedAt) return undefined
	return {
		factoryName,
		deviceClass,
		deviceType,
		id: sk[0],
		ipAddress: sk[1],
		name,
		status,
		deviceAttributes,
	}
}

export { mapDynamoDBItemToResponse }
