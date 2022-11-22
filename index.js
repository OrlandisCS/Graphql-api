const {
	ApolloServerPluginLandingPageGraphQLPlayground,
} = require('apollo-server-core');
const { ApolloServer } = require('apollo-server');
const typeDefs = require('./db/schema');
const resolvers = require('./db/resolvers');
const conectarDB = require('./config/db');

//Conectar la database
conectarDB();

//servidor
const server = new ApolloServer({
	typeDefs,
	resolvers,
	plugins: [ApolloServerPluginLandingPageGraphQLPlayground({})],
});

//Start server
server.listen().then(({ url }) => {
	console.log(`Servidor en la URL ${url}`);
});
