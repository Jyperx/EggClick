import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // El secreto debe coincidir con el de FastAPI (JWT_SECRET)
    const secret = process.env.JWT_SECRET || "super-secret-key-egg-game";
    
    // Firmamos un token que el backend de FastAPI puede verificar
    const token = jwt.sign(
      { sub: session.user.email }, 
      secret, 
      { expiresIn: '2h' } // Expira en 2 horas
    );
    
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
