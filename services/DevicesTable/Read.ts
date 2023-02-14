import { DynamoDB } from 'aws-sdk'
import {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Context,
} from 'aws-lambda'
import { mapDynamoDBItemToResponse } from '../../utils/mappers'
import { DBEntry } from '../../types'

const TABLE_NAME = process.env.TABLE_NAME
const PRIMARY_KEY = process.env.PRIMARY_KEY
const dbClient = new DynamoDB.DocumentClient()

const handler = async (
	event: APIGatewayProxyEvent,
	contex: Context
): Promise<APIGatewayProxyResult> => {
	const result: APIGatewayProxyResult = {
		statusCode: 200,
		body: 'Hello from DynamoDb',
	}
	try {
		const queryResp = await dbClient.scan({ TableName: TABLE_NAME! }).promise()
		const items = queryResp.Items?.map((item) =>
			mapDynamoDBItemToResponse(item as DBEntry)
		)
		const finalItems = items?.filter((item) => item)
		console.log('DB items', items)
		result.body = JSON.stringify(finalItems)
	} catch (error) {}
	return result
}

export { handler }
