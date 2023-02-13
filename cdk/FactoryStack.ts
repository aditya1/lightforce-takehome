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
	private spacesTable = new GenericTable(this, {
		tableName: 'DevicesTable',
		primaryKey: 'pk',
		sortKey: 'sk',
		createLambdaPath: 'Create',
		readLambdaPath: 'Read',
	})

	constructor(scope: Construct, id: string, props: StackProps) {
		super(scope, id, props)
		const deviceLambda = new NodejsFunction(this, 'deviceLambda', {
			runtime: Runtime.NODEJS_14_X,
			entry: join(
				join(__dirname, '..', 'services', 'DevicesTable', 'getDevices.ts')
			),
			handler: 'handler',
			functionName: 'deviceLambda',
		})

		// Hello Api lambda integration:
		const deviceLambdaIntegration = new LambdaIntegration(deviceLambda, {
			allowTestInvoke: true,
		})

		const factoryResource = this.api.root.addResource('device')
		factoryResource.addMethod('GET', this.spacesTable.readLambdaIntegration)
		factoryResource.addMethod('POST', this.spacesTable.createLambdaIntegration)
	}
}
