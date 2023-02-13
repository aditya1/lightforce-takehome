import { App } from 'aws-cdk-lib'
import { FactoryStack } from './FactoryStack'

const app = new App()
new FactoryStack(app, 'Factory-Stack', {
	stackName: 'FactoryFinder',
})
