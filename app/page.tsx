
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8">
      <div className="relative w-48 h-48 mb-4">
        <Image
          src="/collegelogo.png"
          alt="HBT Logo"
          fill
          className="object-contain"
          priority
        />
      </div>

      <h1 className="text-4xl font-bold text-blue-900 tracking-tight">
        HBT Medical College <br /> Official Merchandise Store
      </h1>

      <p className="text-xl text-gray-600 max-w-2xl">
        High-quality apparel and accessories exclusively for registered students.
      </p>

      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-8 py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition font-medium shadow-lg"
        >
          Student Login
        </Link>
        <Link
          href="/register"
          className="px-8 py-3 bg-white text-blue-900 border-2 border-blue-900 rounded-lg hover:bg-blue-50 transition font-medium"
        >
          Register Now
        </Link>
      </div>

      <div className="mt-12 p-4 bg-blue-50 rounded-lg text-sm text-blue-800 max-w-md">
        <p className="font-semibold mb-1">Notice for Students</p>
        <p>You must verify your Roll Number during registration. Only valid students on the list can access the store.</p>
      </div>
    </div>
  );
}
