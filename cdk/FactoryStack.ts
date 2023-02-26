import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import {
	Function as LambdaFunction,
	Runtime,
	Code,
} from 'aws-cdk-lib/aws-lambda'
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway'
import { join } from 'path'
import { GenericTable } from './GenericTable'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
export class FactoryStack extends Stack {
	private api = new RestApi(this, 'FactoryApi')

	//This will create DynamoDB table and will pass names of lambdas to used for CRUD ops.
	//Here we will used
	private spacesTable = new GenericTable(this, {
		tableName: 'DevicesTable',
		primaryKey: 'pk',
		sortKey: 'sk',
		createLambdaPath: 'Create',
		readLambdaPath: 'Read',
		deleteLambdaPath: 'Delete',
		updateLambdaPath: 'Update',
	})

	constructor(scope: Construct, id: string, props: StackProps) {
		super(scope, id, props)

		const factoryResource = this.api.root.addResource('device')
		//Defines Get resource in devices in APIGateway
		factoryResource.addMethod('GET', this.spacesTable.readLambdaIntegration)
		//Defines POST resource in devices in APIGateway
		factoryResource.addMethod('POST', this.spacesTable.createLambdaIntegration)
		//Adds deleteResource with ID as pathParameter
		const deleteResource = factoryResource.addResource('{id}')
		deleteResource.addMethod(
			'DELETE',
			this.spacesTable.deleteLambdaIntegration,
			{
				requestParameters: {
					'method.request.path.id': true,
				},
			}
		)
		//Adds put requests with deviceID as path Parameter
		deleteResource.addMethod('PUT', this.spacesTable.updateLambdaIntegration, {
			requestParameters: {
				'method.request.path.id': true,
			},
		})
	}
}
