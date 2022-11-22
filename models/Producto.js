const moongose = require('mongoose');

const ProductosSchema = moongose.Schema({
	nombre: {
		type: String,
		required: true,
		trim: true,
	},
	stock: {
		type: Number,
		required: true,
		trim: true,
	},
	precio: {
		type: Number,
		required: true,
		trim: true,
	},
	creado: {
		type: Date,
		default: Date.now(),
	},
});

module.exports = moongose.model('Producto', ProductosSchema);
