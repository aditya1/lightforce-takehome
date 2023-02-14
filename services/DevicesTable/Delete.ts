import { DynamoDB } from 'aws-sdk'
import {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from 'aws-lambda'
import { DBEntry } from '../../types'

const TABLE_NAME = process.env.TABLE_NAME
const PRIMARY_KEY = process.env.PRIMARY_KEY
const dbClient = new DynamoDB.DocumentClient()

const handler = async (
	event: APIGatewayProxyEvent,
	contex: Context
): Promise<APIGatewayProxyResult> => {
	const { pathParameters } = event
	const result: APIGatewayProxyResult = {
		statusCode: 200,
		body: 'Hello from DynamoDb',
	}
	if (!pathParameters?.id) {
		return {
			statusCode: 400,
			body: 'Device Id not passed!',
		}
	}
	const scanParams = {
		TableName: TABLE_NAME!,
		FilterExpression: 'contains(sk, :searchString)',
		ExpressionAttributeValues: {
			':searchString': pathParameters.id,
		},
	}
	let pk, sk
	try {
		const scanResp = await dbClient.scan(scanParams).promise()
		if (!scanResp.Count) {
			return {
				statusCode: 404,
				body: 'Device not found in any factory with given ID.',
			}
		}
		const items = scanResp.Items
		if (items && items.length > 0) {
			const selectedItem = items[0] as DBEntry
			pk = selectedItem.pk
			sk = selectedItem.sk
			const { deletedAt } = selectedItem
			if (deletedAt) {
				const date = new Date(deletedAt)
				return {
					statusCode: 200,
					body: `Device id ${
						pathParameters.id
					} from ${pk} Factory was deleted at ${date.toLocaleString('en-US', {
						timeZone: 'EST',
					})}`,
				}
			}
		}
	} catch (e) {}
	console.log('Item to delete is ', { pk, sk })
	const updateExpression = 'SET #field = :value'
	const expressionAttributeNames = {
		'#field': 'deletedAt',
	}
	const expressionAttributeValues = {
		':value': Date.now(),
	}
	const params = {
		TableName: TABLE_NAME!,
		Key: { pk, sk },
		UpdateExpression: updateExpression,
		ExpressionAttributeNames: expressionAttributeNames,
		ExpressionAttributeValues: expressionAttributeValues,
		ConditionExpression: 'attribute_not_exists(#field)',
		ReturnValues: 'UPDATED_NEW',
	}
	let deleteTime
	try {
		const deleteResp = await dbClient.update(params).promise()
		const deletedAt = deleteResp?.Attributes?.deletedAt
		if (deletedAt) {
		}
	} catch (e) {
		console.log('Failed to update item', e)
		return {
			statusCode: 400,
			body: 'Failed to delete given device',
		}
	}
	result.body = `Deleted device id ${pathParameters.id} from ${pk} Factory`
	return result
}

export { handler }
