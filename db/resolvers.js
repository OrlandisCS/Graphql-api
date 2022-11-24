require('dotenv').config({ path: 'variables.env' });
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

//Models
const Usuario = require('../models/Usuario');
const Producto = require('../models/Producto');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');

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
		obtenerClientes: async () => {
			try {
				const clientes = await Cliente.find({});
				return clientes;
			} catch (error) {
				console.log(error);
			}
		},
		obtenerClientesByVendedor: async (_, {}, ctx) => {
			const { id } = ctx.usuario;
			try {
				const clientes = await Cliente.find({
					vendedor: id.toString(),
				});
				return clientes;
			} catch (error) {
				console.log(error);
			}
		},
		obtenerCliente: async (_, { id }, ctx) => {
			const { id: userId } = ctx.usuario;
			//Verificar cliete
			const cliente = await Cliente.findById(id);
			if (!cliente) {
				throw new Error('El cliente no fue encontrado');
			}
			//quien los creo puede verlo
			if (cliente.vendedor.toString() !== userId.toString()) {
				throw new Error('Credenciales insuficientes');
			}
			return cliente;
		},
		obtenerPedidos: async () => {
			try {
				const pedidos = await Pedido.find({});
				return pedidos;
			} catch (error) {
				console.log(error);
			}
		},
		obtenerPedidosVendedor: async (_, {}, ctx) => {
			try {
				const { id } = ctx.usuario;

				const pedidos = await Pedido.find({ vendedor: id });
				return pedidos;
			} catch (error) {
				console.log(error);
			}
		},
		obtenerPedido: async (_, { id }, ctx) => {
			const { id: userId } = ctx.usuario;
			//Verificar cliete
			const pedido = await Pedido.findById(id);
			if (!pedido) {
				throw new Error('El pedido no fue encontrado');
			}
			//quien los creo puede verlo
			if (pedido.vendedor.toString() !== userId.toString()) {
				throw new Error('Credenciales insuficientes');
			}
			return pedido;
		},
		obtenerPedidoEstado: async (_, { estado }, ctx) => {
			try {
				const { id: userId } = ctx.usuario;
				const pedido = await Pedido.find({
					estado,
					vendedor: userId,
				});
				if (!pedido) {
					throw new Error('El pedido no fue encontrado');
				}
				return pedido;
			} catch (error) {
				console.log(error);
			}
		},
		mejoresClientes: async () => {
			const clientes = await Pedido.aggregate([
				{ $match: { estado: 'COMPLETADO' } },
				{
					$group: {
						_id: '$cliente',
						total: { $sum: '$total' },
					},
				},
				{
					$lookup: {
						from: 'clientes',
						localField: '_id',
						foreignField: '_id',
						as: 'cliente',
					},
				},
				{
					$sort: { total: -1 },
				},
			]);

			return clientes;
		},
		mejoresVendedores: async () => {
			const vendedores = await Pedido.aggregate([
				{ $match: { estado: 'COMPLETADO' } },
				{
					$group: {
						_id: '$vendedor',
						total: { $sum: '$total' },
					},
				},
				{
					$lookup: {
						from: 'usuarios',
						localField: '_id',
						foreignField: '_id',
						as: 'vendedor',
					},
				},
				{
					$limit: 5,
				},
				{
					$sort: { total: -1 },
				},
			]);

			return vendedores;
		},
		buscarProducto: async (_, { texto }) => {
			try {
				const productos = await Producto.find({
					$text: { $search: texto },
				}).limit(10);
				return productos;
			} catch (error) {
				console.log(error);
			}
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
		actualizarProducto: async (_, { id, input }) => {
			//revisar que exista
			let producto = await Producto.findById(id);
			if (!producto) {
				throw new Error('El producto no fue encontrado');
			}
			//Guardar en BD
			producto = await Producto.findByIdAndUpdate(
				{ _id: id },
				input,
				{ new: true }
			);
			return producto;
		},
		eliminarProducto: async (_, { id }) => {
			//revisar que exista
			const producto = await Producto.findById(id);
			if (!producto) {
				throw new Error('El producto no fue encontrado');
			}
			await Producto.findByIdAndDelete({ _id: id });
			return 'Producto eliminado';
		},
		nuevoCliente: async (_, { input }, ctx) => {
			const { email } = input;
			const { id } = ctx.usuario;
			//Verificar si esta registrado
			const cliente = await Cliente.findOne({ email });
			if (cliente) {
				throw new Error('El cliente ya está registrado');
			}
			const nuevoCliente = new Cliente(input);
			//Asignar vendedor
			nuevoCliente.vendedor = id;
			//guardar en bd
			try {
				const resultado = await nuevoCliente.save();
				return resultado;
			} catch (error) {
				console.log(error);
			}
		},
		actualizarCliente: async (_, { id, input }, ctx) => {
			const { id: userId } = ctx.usuario;
			//Verificar si existe
			let cliente = await Cliente.findById(id);
			if (!cliente) {
				throw new Error('El cliente no fue encontrado');
			}
			//Si es el vendedor quien edita
			if (cliente.vendedor.toString() !== userId.toString()) {
				throw new Error('Credenciales insuficientes');
			}
			//Guardar actualización
			cliente = await Cliente.findOneAndUpdate({ _id: id }, input, {
				new: true,
			});
			return cliente;
		},
		eliminarCliente: async (_, { id }, ctx) => {
			const { id: userId } = ctx.usuario;
			const cliente = await Cliente.findById(id);
			if (!cliente) {
				throw new Error('El Cliente no fue encontrado');
			}
			if (cliente.vendedor.toString() !== userId.toString()) {
				throw new Error('Creendenciales insuficientes');
			}
			await Cliente.findByIdAndDelete(id);
			return 'Cliente eliminado correctamente';
		},
		nuevoPedido: async (_, { input }, ctx) => {
			const { id: userId } = ctx.usuario;

			//Verificar Cliente y vendedor correcto
			const { cliente, pedido } = input;

			const clienteExiste = await Cliente.findById(cliente);
			if (!clienteExiste) {
				throw new Error('El cliente no fue encontrado');
			}

			if (clienteExiste.vendedor.toString() !== userId.toString()) {
				throw new Error('Creendenciales insuficientes');
			}
			for await (const articulo of pedido) {
				const { id, cantidad } = articulo;
				const producto = await Producto.findById(id);
				if (cantidad > producto.stock) {
					throw new Error(
						`El articulo ${nombre} excede la cantidad disponible`
					);
				} else {
					producto.stock = producto.stock - cantidad;
					await producto.save();
				}
			}
			//instanciar producto para su creacion
			const nuevoPedido = new Pedido(input);
			nuevoPedido.vendedor = userId;

			const resultado = await nuevoPedido.save();
			return resultado;
		},
		actualizarPedido: async (_, { id, input }, ctx) => {
			const { id: userId } = ctx.usuario;
			const { cliente } = input;
			//Verificar si existe
			let pedido = await Pedido.findById(id);
			if (!pedido) {
				throw new Error('El Pedido no fue encontrado');
			}
			const clienteExiste = await Cliente.findById(cliente);
			if (!clienteExiste) {
				throw new Error('El cliente no fue encontrado');
			}
			//Si es el vendedor quien edita
			if (clienteExiste.vendedor.toString() !== userId.toString()) {
				throw new Error('Credenciales insuficientes');
			}
			//revisar stock
			for await (const articulo of pedido.pedido) {
				const { id, cantidad } = articulo;
				const producto = await Producto.findById(id);
				if (cantidad > producto.stock) {
					throw new Error(
						`El articulo ${nombre} excede la cantidad disponible`
					);
				} else {
					producto.stock = producto.stock - cantidad;
					await producto.save();
				}
			}
			//Guardar actualización
			const resultado = await Pedido.findOneAndUpdate(
				{ _id: id },
				input,
				{
					new: true,
				}
			);
			return resultado;
		},
		eliminarPedido: async (_, { id }, ctx) => {
			const { id: userId } = ctx.usuario;
			const pedido = await Pedido.findById(id);

			if (!pedido) {
				throw new Error('El pedido no fue encontrado');
			}
			if (pedido.vendedor.toString() !== userId.toString()) {
				throw new Error('Creendenciales insuficientes');
			}
			for await (const articulo of pedido) {
				const { id, cantidad } = articulo;
				const producto = await Producto.findById(id);
				if (articulo.estado !== 'COMPLETADO')
					producto.stock = producto.stock + cantidad;
				await producto.save();
			}
			await Pedido.findOneAndDelete({ _id: id });

			return 'Pedido eliminado';
		},
	},
};
module.exports = resolvers;
