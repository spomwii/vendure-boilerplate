// app/routes/door.id.tsx (Remix) - Test dynamic route with different parameter name
export default function DoorIdPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Door ID Route Working!
        </h1>
        <p className="text-gray-600">
          This is a dynamic route with parameter 'id' instead of 'doorId'.
        </p>
      </div>
    </div>
  );
}
