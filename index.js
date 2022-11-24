require('dotenv').config({ path: 'variables.env' });
const {
	ApolloServerPluginLandingPageGraphQLPlayground,
} = require('apollo-server-core');
const { ApolloServer } = require('apollo-server');
const jwt = require('jsonwebtoken');

const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');
const conectarDB = require('./config/db');

//Conectar la database
conectarDB();

//servidor
const server = new ApolloServer({
	typeDefs,
	resolvers,
	context: async ({ req }) => {
		//console.log(req.header('authorization'));
		const token = req.header('authorization') || '';
		if (token) {
			try {
				const usuario = await jwt.verify(
					token,
					process.env.KEY_TOKEN
				);
				return {
					usuario,
				};
			} catch (error) {
				console.log(error);
			}
		}
	},
	plugins: [ApolloServerPluginLandingPageGraphQLPlayground({})],
});

//Start server
server.listen().then(({ url }) => {
	console.log(`Servidor en la URL ${url}`);
});
