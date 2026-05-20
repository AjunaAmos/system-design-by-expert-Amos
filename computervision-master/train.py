#!/usr/bin/env python3
"""
Training script for Coffee Disease Classification Model

This script trains an EfficientNetB0 model on coffee disease images.
It expects the dataset to be organized in the following structure:

data/
├── train/
│   ├── Healthy/
│   ├── Coffee_Leaf_Rust/
│   ├── Cercospora_Leaf_Spot/
│   ├── Phoma_Leaf_Spot/
│   └── Coffee_Berry_Disease/
└── test/
    ├── Healthy/
    ├── Coffee_Leaf_Rust/
    ├── Cercospora_Leaf_Spot/
    ├── Phoma_Leaf_Spot/
    └── Coffee_Berry_Disease/

To get the dataset:
1. Download from PlantVillage: https://github.com/spMohanty/PlantVillage-Dataset
2. Extract coffee-related images into the above structure
3. Run this script: python train.py

The trained model will be saved as models/coffee_disease_efficientnetb0.keras
"""

import os
import pathlib
import tensorflow as tf
from tensorflow.keras import layers
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from pathlib import Path

# Configuration
DATA_DIR = Path("data")
MODEL_DIR = Path("models")
MODEL_PATH = MODEL_DIR / "coffee_disease_efficientnetb0.keras"
INPUT_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 50

# Labels (must match app/labels.py)
LABELS = [
    "Healthy",
    "Coffee_Leaf_Rust",
    "Cercospora_Leaf_Spot",
    "Phoma_Leaf_Spot",
    "Coffee_Berry_Disease",
]

def create_model(num_classes):
    """Create EfficientNetB0 model with custom head"""
    base_model = EfficientNetB0(
        include_top=False,
        weights="imagenet",
        input_shape=(INPUT_SIZE, INPUT_SIZE, 3),
    )

    # Freeze base model initially
    base_model.trainable = False

    model = tf.keras.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.2),
        layers.Dense(num_classes, activation='softmax')
    ])

    return model

def prepare_datasets():
    """Load and prepare training/validation datasets"""
    if not DATA_DIR.exists():
        raise FileNotFoundError(f"Data directory not found: {DATA_DIR}. Please download and organize the dataset.")

    train_ds = tf.keras.utils.image_dataset_from_directory(
        DATA_DIR / "train",
        image_size=(INPUT_SIZE, INPUT_SIZE),
        batch_size=BATCH_SIZE,
        validation_split=0.2,
        subset="training",
        seed=123,
        label_mode='categorical'
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        DATA_DIR / "train",
        image_size=(INPUT_SIZE, INPUT_SIZE),
        batch_size=BATCH_SIZE,
        validation_split=0.2,
        subset="validation",
        seed=123,
        label_mode='categorical'
    )

    # Data augmentation
    data_augmentation = tf.keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.1),
        layers.RandomZoom(0.1),
    ])

    train_ds = train_ds.map(lambda x, y: (data_augmentation(x), y))

    # Performance optimization
    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.cache().shuffle(1000).prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)

    return train_ds, val_ds

def main():
    # Create model directory
    MODEL_DIR.mkdir(exist_ok=True)

    # Prepare datasets
    train_ds, val_ds = prepare_datasets()

    # Get number of classes
    num_classes = len(LABELS)

    # Create model
    model = create_model(num_classes)

    # Compile model
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    # Callbacks
    callbacks = [
        EarlyStopping(
            monitor='val_accuracy',
            patience=10,
            restore_best_weights=True
        ),
        ModelCheckpoint(
            MODEL_PATH,
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]

    # Train model
    print(f"Training model with {num_classes} classes...")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
        callbacks=callbacks
    )

    # Fine-tune: unfreeze some layers
    print("Fine-tuning model...")
    base_model = model.layers[0]
    base_model.trainable = True

    # Freeze all layers except the last 20
    for layer in base_model.layers[:-20]:
        layer.trainable = False

    # Recompile with lower learning rate
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-5),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    # Continue training
    model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=20,
        callbacks=callbacks
    )

    print(f"Model saved to {MODEL_PATH}")

if __name__ == "__main__":
    main()