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
		body: '',
	}
	if (!pathParameters?.id) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				message: 'Device Id not passed!',
			}),
		}
	}
	//Building scan query to find given device entry from
	//DyanmoDB
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
		//If no device found then we will return 404 response
		if (!scanResp.Count) {
			return {
				statusCode: 404,
				body: JSON.stringify({
					message: `Device not found in any factory with given ID ${pathParameters.id}.`,
				}),
			}
		}
		const items = scanResp.Items
		if (items && items.length > 0) {
			//if device is found then its partition key and sort key will be copied
			const selectedItem = items[0] as DBEntry
			pk = selectedItem.pk
			sk = selectedItem.sk
			const { deletedAt } = selectedItem
			//If deletedAt attribute is set in the DB record is set, that means
			//This device is already deleted.
			if (deletedAt) {
				const date = new Date(deletedAt)
				return {
					statusCode: 200,
					body: JSON.stringify({
						message: `Device id ${
							pathParameters.id
						} from ${pk} Factory was deleted at ${date.toLocaleString('en-US', {
							timeZone: 'EST',
						})}`,
					}),
				}
			}
		}
	} catch (e) {}
	console.log('Item to delete is ', { pk, sk })
	//Building update expression to to set deletedAt attribute
	//for the DynamoDB record. We will not actually delete the entire DB record.
	//Operation is softDelete. Downside is We will consume static IP Address
	const updateExpression = 'SET #field = :value'
	const deleteTime = Date.now()
	const expressionAttributeNames = {
		'#field': 'deletedAt',
	}
	const expressionAttributeValues = {
		':value': deleteTime,
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

	try {
		const deleteResp = await dbClient.update(params).promise()
		const deletedAt = deleteResp?.Attributes?.deletedAt
		if (deletedAt) {
			const date = new Date(deletedAt)
			result.body = JSON.stringify({
				message: `Device id ${
					pathParameters.id
				} from ${pk} Factory was deleted at ${date.toLocaleString('en-US', {
					timeZone: 'EST',
				})}`,
			})
		}
	} catch (e) {
		console.log('Failed to update item', e)
		return {
			statusCode: 500,
			body: JSON.stringify({ message: 'Failed to delete given device' }),
		}
	}
	return result
}

export { handler }
