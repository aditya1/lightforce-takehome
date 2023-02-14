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
		updatedAt,
	} = item
	const tokens = sk.split('::')
	if (tokens.length !== 2) return undefined
	if (deletedAt) return undefined

	return {
		factoryName,
		deviceClass,
		deviceType,
		id: tokens[0],
		ipAddress: tokens[1],
		name,
		status,
		deviceAttributes,
		updatedAt: updatedAt ? new Date(updatedAt).toLocaleString() : undefined,
	}
}

export { mapDynamoDBItemToResponse }
