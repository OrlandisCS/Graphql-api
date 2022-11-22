require('dotenv').config({ path: 'variables.env' });
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

//Models
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');

//Retorna token del usuario

const crearToken = (usuario, sign, expiresIn) => {
	const { id, nombre, apellido, email, creado } = usuario;
	return jwt.sign({ id, nombre, apellido, email, creado }, sign, {
		expiresIn,
	});
};

//Resolvers -> Los resolvers siempre son arraw function
//Para obtener se utiliza Query
//Para crea, actulizar o eliminar utilizamos los mutations
const resolvers = {
	Query: {
		obtenerUsuario: async (_, { token }) => {
			const usuarioId = await jwt.verify(
				token,
				process.env.KEY_TOKEN
			);

			return usuarioId;
		},
		obtenerProductos: async () => {
			try {
				const productos = await Producto.find({});
				return productos;
			} catch (error) {
				console.log(error);
			}
		},
		obtenerProducto: async (_, { id }) => {
			//revisar que exista
			const producto = await Producto.findById(id);
			if (!producto) {
				throw new Error('El producto no fue encontrado');
			}
			return producto;
		},
	},
	Mutation: {
		nuevoUsuario: async (_, { input }) => {
			const { email, password } = input;
			//Revisar usuario esta registrado
			const existeUsuario = await Usuario.findOne({ email });

			if (existeUsuario) {
				throw new Error('El usuario ya está registrado');
			}
			//Hashear password
			const salt = await bcryptjs.genSalt(10);
			input.password = await bcryptjs.hash(password, salt);
			try {
				//Guardar en DB
				const usuario = new Usuario(input);
				usuario.save();
				return usuario;
			} catch (error) {
				console.log(error);
			}
		},
		autenticarUsuario: async (_, { input }) => {
			const { email, password } = input;
			//Usuario existe
			const existeUsuario = await Usuario.findOne({ email });

			if (!existeUsuario) {
				throw new Error('El usuario no existe');
			}
			//Password revise
			const passwordCorrecto = await bcryptjs.compare(
				password,
				existeUsuario.password
			);
			if (!passwordCorrecto) {
				throw new Error('El password es incorrecto');
			}
			return {
				token: crearToken(
					existeUsuario,
					process.env.KEY_TOKEN,
					'24H'
				),
			};
		},
		nuevoProducto: async (_, { input }) => {
			try {
				const producto = new Producto(input);
				//Almacenar Producto en BD
				const resultado = await producto.save();
				return resultado;
			} catch (error) {
				console.log(error);
			}
		},
	},
};
module.exports = resolvers;
