-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('SELF_PICKUP', 'REGULAR', 'EXPRESS');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingMethod" "ShippingMethod";
