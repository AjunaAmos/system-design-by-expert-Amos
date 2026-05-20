import tensorflow as tf

model = tf.keras.models.load_model('keras_model.h5')
tf.saved_model.save(model, 'my_saved_model')